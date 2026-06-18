import { useState, useEffect, useCallback } from "react";
import { Check, Loader2, Share2, ChevronDown, Search, Phone, User, MessageSquare, Heart, Medal } from "lucide-react";
import { useInView } from "../hooks/useInView";

type Tab = "general" | "honour";
type Step = "form" | "processing" | "success";
const presets = [500, 1000, 2500, 5000, 10000];

interface MemberOption {
  id: string;
  name: string;
  role: string;
  council: string;
}

const seedMembers: MemberOption[] = [
  { id: "1", name: "Dadson Mbogo", role: "Parish board chairman", council: "parish_board" },
  { id: "2", name: "Jeremiah Kimani", role: "V Chairman", council: "parish_board" },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board" },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board" },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board" },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board" },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council" },
  { id: "8", name: "Alice Kuhunya", role: "V Chairlady", council: "women_council" },
  { id: "9", name: "Tiffany Kimani", role: "Women council Secretary", council: "women_council" },
  { id: "10", name: "Esther Mbugua", role: "Women council Treasurer", council: "women_council" },
  { id: "11", name: "Gilbert Wachira", role: "Men council chairman", council: "men_council" },
  { id: "12", name: "Sam Ndiang'ui", role: "Development chairman", council: "development" },
  { id: "13", name: "Wilson Thirikwa", role: "Development Secretary", council: "development" },
  { id: "14", name: "Maria goretti Njenga", role: "Development Treasurer", council: "development" },
];

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function DonationForm() {
  const [tab, setTab] = useState<Tab>("general");
  const [step, setStep] = useState<Step>("form");

  // General donation fields
  const [genAmount, setGenAmount] = useState<number | "custom" | null>(null);
  const [genCustom, setGenCustom] = useState("");
  const [genName, setGenName] = useState("");
  const [genPhone, setGenPhone] = useState("");
  const [genMessage, setGenMessage] = useState("");

  // Honour donation fields
  const [honAmount, setHonAmount] = useState<number | "custom" | null>(null);
  const [honCustom, setHonCustom] = useState("");
  const [honName, setHonName] = useState("");
  const [honPhone, setHonPhone] = useState("");
  const [honMessage, setHonMessage] = useState("");
  const [honoredMember, setHonoredMember] = useState("");
  const [members, setMembers] = useState<MemberOption[]>(seedMembers);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);

  const [receiptNumber, setReceiptNumber] = useState("");
  const [donationId, setDonationId] = useState("");
  const [error, setError] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);
  const [finalDonorName, setFinalDonorName] = useState("");
  const [finalHonouredMember, setFinalHonouredMember] = useState<MemberOption | null>(null);
  const { ref, inView } = useInView();

  const selectedMember = members.find((m) => m.id === honoredMember);

  const filteredMembers = memberSearch
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.role.toLowerCase().includes(memberSearch.toLowerCase()),
      )
    : members;

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data?.members?.length) setMembers(data.members);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const memberParam = params.get("member");
    if (memberParam && members.length) {
      setTab("honour");
      setHonoredMember(memberParam);
    }
  }, [members]);

  const pollStatus = useCallback((checkoutId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/status/${checkoutId}`);
        const data = await res.json();
        if (data.ResultCode === "0" || data.status === "completed") {
          clearInterval(interval);
          setReceiptNumber(data.receipt_number || `TXN-${Date.now()}`);
          setStep("success");
        } else if (data.ResultCode !== undefined && data.ResultCode !== "0") {
          clearInterval(interval);
          setError("Payment failed. Please try again.");
          setStep("form");
        }
      } catch (err: any) {
        clearInterval(interval);
        setError(err?.message || "Network error. Please try again.");
        setStep("form");
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setError("Payment timed out. Please try again.");
      setStep("form");
    }, 60000);
  }, []);

  async function processDonation(params: {
    amount: number;
    donorName: string;
    phone: string;
    message: string;
    honoredMemberId?: string;
  }) {
    setError("");

    if (!params.amount || params.amount < 10) {
      setError("Amount must be at least KES 10");
      setStep("form");
      return;
    }
    if (!params.phone || params.phone.replace(/\s/g, "").length < 10) {
      setError("Enter a valid M-Pesa phone number");
      setStep("form");
      return;
    }

    setStep("processing");
    setFinalAmount(params.amount);
    setFinalDonorName(params.donorName);
    setFinalHonouredMember(params.honoredMemberId ? members.find(m => m.id === params.honoredMemberId) || null : null);

    try {
      const campRes = await fetch("/api/campaigns/development-fund");
      const campData = await campRes.json();
      if (!campData?.id) { setError("Campaign not found"); setStep("form"); return; }

      const donRes = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campData.id,
          donor_name: params.donorName || null,
          amount: params.amount,
          phone: params.phone.replace(/\s/g, ""),
          message: params.message || null,
          honored_member_id: params.honoredMemberId || null,
        }),
      });
      const donData = await donRes.json();
      if (!donRes.ok || !donData.donation?.id) { setError(donData.error || "Failed"); setStep("form"); return; }

      setDonationId(donData.donation.id);

      const mpesaRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: params.phone.replace(/\s/g, ""),
          amount: params.amount,
          donation_id: donData.donation.id,
          account_reference: "Harambee",
          transaction_desc: params.honoredMemberId ? "Honour Donation" : "General Donation",
        }),
      });
      const mpesaData = await mpesaRes.json();
      if (!mpesaRes.ok || !mpesaData.CheckoutRequestID) { setError(mpesaData.error || "M-Pesa failed"); setStep("form"); return; }

      pollStatus(mpesaData.CheckoutRequestID);
    } catch (err: any) { setError(err?.message || "Network error. Please try again."); setStep("form"); }
  }

  function handleGeneralSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = genAmount === "custom" ? Number(genCustom) || 0 : genAmount || 0;
    processDonation({ amount, donorName: genName, phone: genPhone, message: genMessage });
  }

  function handleHonourSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!honoredMember) { setError("Please select a member to honour"); return; }
    const amount = honAmount === "custom" ? Number(honCustom) || 0 : honAmount || 0;
    processDonation({ amount, donorName: honName, phone: honPhone, message: honMessage, honoredMemberId: honoredMember });
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `I just gave KES ${finalAmount.toLocaleString()} to AIPCA Bahati Harambee!${finalHonouredMember ? ` In honour of ${finalHonouredMember.name}.` : ""}${receiptNumber ? ` Receipt: ${receiptNumber}` : ""} Join me: ${window.location.origin}#give`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function reset() {
    setStep("form");
    setGenAmount(null); setGenCustom(""); setGenName(""); setGenPhone(""); setGenMessage("");
    setHonAmount(null); setHonCustom(""); setHonName(""); setHonPhone(""); setHonMessage("");
    setHonoredMember(""); setReceiptNumber(""); setDonationId(""); setError(""); setFinalHonouredMember(null);
  }

  return (
    <section id="give" className="scroll-mt-16 bg-cream-dark px-4 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-xs font-bold text-amber-dark uppercase tracking-widest">
            <Heart size={12} />
            Give
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Support the Vision
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Every contribution brings us closer to completing this house of worship.
          </p>
        </div>

        {step === "form" && (
          <div className={`mt-8 ${inView ? "animate-slide-up" : "opacity-0"}`} style={{ animationDelay: "0.15s" }}>
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => setTab("general")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                  tab === "general"
                    ? "bg-amber text-nobuk shadow-md shadow-amber/30"
                    : "border-2 border-gray-200 bg-white text-muted hover:border-amber hover:text-amber-dark"
                }`}
              >
                <Heart size={16} />
                Give General
              </button>
              <button
                onClick={() => setTab("honour")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                  tab === "honour"
                    ? "bg-amber text-nobuk shadow-md shadow-amber/30"
                    : "border-2 border-gray-200 bg-white text-muted hover:border-amber hover:text-amber-dark"
                }`}
              >
                <Medal size={16} />
                Honour a Member
              </button>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
              </div>
            )}

            {tab === "general" && (
              <form onSubmit={handleGeneralSubmit} className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="mb-3 block text-sm font-bold text-nobuk">Amount (KES)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {presets.map((p) => (
                      <button key={p} type="button" onClick={() => { setGenAmount(p as any); setGenCustom(""); }}
                        className={`btn-lift rounded-lg py-2.5 text-sm font-bold transition ${
                          genAmount === p ? "bg-nobuk text-white shadow-sm" : "border-2 border-gray-200 bg-white text-muted hover:border-nobuk hover:text-nobuk"
                        }`}>{p.toLocaleString()}</button>
                    ))}
                  </div>
                  <input type="number" placeholder="Custom amount" value={genCustom}
                    onChange={(e) => { setGenCustom(e.target.value); if (e.target.value) setGenAmount("custom"); }}
                    className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                      <User size={14} className="text-amber" /> Your name <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input type="text" placeholder="e.g. Mary Wanjiku" value={genName} onChange={(e) => setGenName(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                      <Phone size={14} className="text-amber" /> M-Pesa number
                    </label>
                    <input type="tel" placeholder="07XX XXX XXX" value={genPhone} onChange={(e) => setGenPhone(formatPhone(e.target.value))}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                    <p className="mt-1 text-xs text-muted">You will receive an M-Pesa prompt to enter your PIN</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                    <MessageSquare size={14} className="text-amber" /> Message <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea placeholder="With thanksgiving for..." value={genMessage} onChange={(e) => setGenMessage(e.target.value)} rows={2}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                </div>

                <button type="submit" disabled={!genAmount && !genCustom}
                  className="btn-lift w-full rounded-full bg-nobuk py-3.5 text-base font-bold text-white shadow-sm hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-40">
                  Give KES {(genAmount === "custom" ? Number(genCustom) || 0 : genAmount || 0).toLocaleString()} via M-Pesa
                </button>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider">Or pay directly via M-Pesa Paybill</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-nobuk">247 247</p>
                  <div className="mx-auto mt-1 inline-flex items-center gap-1 rounded-full bg-nobuk-muted px-4 py-1.5">
                    <span className="text-xs text-muted">Account:</span>
                    <span className="text-xs font-bold text-nobuk">Harambee</span>
                  </div>
                </div>
              </form>
            )}

            {tab === "honour" && (
              <form onSubmit={handleHonourSubmit} className="space-y-5">
                <div className="rounded-2xl border-2 border-amber/40 bg-white p-5 shadow-lg">
                  <label className="mb-3 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                    <Medal size={16} className="text-amber" />
                    Select Member to Honour <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setMemberOpen(!memberOpen)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-amber/30 bg-amber-light px-4 py-3 text-left outline-none transition-all hover:border-amber focus:border-amber focus:ring-2 focus:ring-amber/30">
                      {selectedMember ? (
                        <>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-white shadow-sm">
                            {initials(selectedMember.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-nobuk">{selectedMember.name}</p>
                            <p className="text-xs font-medium text-amber-dark">{selectedMember.role}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber/40 bg-amber-light text-amber">
                            <Medal size={16} />
                          </div>
                          <span className="text-base font-medium text-amber-dark">Who would you like to honour?</span>
                        </>
                      )}
                      <ChevronDown size={20} className={`ml-auto shrink-0 text-amber transition ${memberOpen ? "rotate-180" : ""}`} />
                    </button>

                    {memberOpen && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border-2 border-amber/30 bg-white shadow-xl animate-scale-in">
                        <div className="border-b border-amber/20 bg-amber-light/50 p-3">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-dark" />
                            <input type="text" placeholder="Search committee members..." value={memberSearch}
                              onChange={(e) => setMemberSearch(e.target.value)}
                              className="w-full rounded-lg border border-amber/20 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-nobuk placeholder-amber-dark/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20" />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-amber/10">
                          {filteredMembers.map((m) => (
                            <button key={m.id} type="button"
                              onClick={() => { setHonoredMember(m.id); setMemberOpen(false); setMemberSearch(""); }}
                              className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-all ${
                                honoredMember === m.id
                                  ? "bg-amber/20 font-bold shadow-inner"
                                  : "hover:bg-amber-light/80 hover:pl-5"
                              }`}>
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                                honoredMember === m.id ? "bg-amber text-white" : "bg-amber-light text-amber-dark"
                              }`}>{initials(m.name)}</div>
                              <div className="min-w-0">
                                <p className={`text-sm ${honoredMember === m.id ? "text-nobuk font-bold" : "text-nobuk font-medium"}`}>{m.name}</p>
                                <p className="text-xs text-muted">{m.role}</p>
                              </div>
                              {honoredMember === m.id && (
                                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-amber">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                          {filteredMembers.length === 0 && (
                            <div className="px-4 py-8 text-center">
                              <Search size={24} className="mx-auto mb-2 text-amber/40" />
                              <p className="text-sm font-medium text-muted">No members found</p>
                              <p className="text-xs text-muted/70">Try a different search term</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedMember && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber/30 bg-amber-light/80 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber">
                        <Medal size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-nobuk">Honouring: {selectedMember.name}</p>
                        <p className="text-xs text-amber-dark">{selectedMember.role}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="mb-3 block text-sm font-bold text-nobuk">Honour Amount (KES)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {presets.map((p) => (
                      <button key={p} type="button" onClick={() => { setHonAmount(p as any); setHonCustom(""); }}
                        className={`btn-lift rounded-lg py-2.5 text-sm font-bold transition ${
                          honAmount === p ? "bg-nobuk text-white shadow-sm" : "border-2 border-gray-200 bg-white text-muted hover:border-nobuk hover:text-nobuk"
                        }`}>{p.toLocaleString()}</button>
                    ))}
                  </div>
                  <input type="number" placeholder="Custom amount" value={honCustom}
                    onChange={(e) => { setHonCustom(e.target.value); if (e.target.value) setHonAmount("custom"); }}
                    className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                      <User size={14} className="text-amber" /> Your name <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input type="text" placeholder="e.g. Mary Wanjiku" value={honName} onChange={(e) => setHonName(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                      <Phone size={14} className="text-amber" /> M-Pesa number
                    </label>
                    <input type="tel" placeholder="07XX XXX XXX" value={honPhone} onChange={(e) => setHonPhone(formatPhone(e.target.value))}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                    <p className="mt-1 text-xs text-muted">You will receive an M-Pesa prompt to enter your PIN</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-nobuk">
                    <MessageSquare size={14} className="text-amber" /> Message <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea placeholder="In honour of..." value={honMessage} onChange={(e) => setHonMessage(e.target.value)} rows={2}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-nobuk outline-none transition focus:border-nobuk" />
                </div>

                <div className="rounded-2xl border-2 border-amber/30 bg-amber-light/50 p-4 text-center">
                  <p className="text-xs font-bold text-amber-dark uppercase tracking-wider">Honour Donation via M-Pesa</p>
                  <p className="mt-1 text-sm text-muted">Paybill: <span className="font-bold text-nobuk">247 247</span> Account: <span className="font-bold text-amber-dark">Harambee</span></p>
                </div>

                <button type="submit" disabled={!honoredMember || (!honAmount && !honCustom)}
                  className="btn-lift w-full rounded-full bg-nobuk py-3.5 text-base font-bold text-white shadow-sm hover:bg-nobuk-light disabled:cursor-not-allowed disabled:opacity-40">
                  {honoredMember ? `Honour ${selectedMember?.name} with KES ${(honAmount === "custom" ? Number(honCustom) || 0 : honAmount || 0).toLocaleString()}` : "Select a member to honour"}
                </button>
              </form>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="mt-8 animate-fade-in rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-nobuk-muted">
              <Loader2 size={32} className="animate-spin text-nobuk" />
            </div>
            <h3 className="text-lg font-bold text-nobuk">Processing{finalHonouredMember ? ` honour for ${finalHonouredMember.name}` : ""}...</h3>
            <p className="mt-2 text-sm text-muted">Check your phone for the M-Pesa PIN prompt</p>
            <p className="mt-1 text-xs text-muted">Amount: KES {finalAmount.toLocaleString()}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="animate-progress-shine h-full w-full rounded-full bg-nobuk/30" />
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="mt-8 animate-scale-in rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 animate-bounce-in items-center justify-center rounded-full bg-nobuk">
              <Check size={28} className="text-white" />
            </div>

            <h3 className="text-xl font-bold text-nobuk">
              Asante sana{finalDonorName ? `, ${finalDonorName}` : ""}!
            </h3>
            <p className="mt-2 text-sm text-muted">
              {finalHonouredMember
                ? `Your honour gift of KES ${finalAmount.toLocaleString()} for ${finalHonouredMember.name} has been received.`
                : `Your gift of KES ${finalAmount.toLocaleString()} has been received.`}
            </p>

            {finalHonouredMember && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-amber-light px-4 py-1.5">
                <Medal size={12} className="text-amber-dark" />
                <span className="text-xs font-bold text-amber-dark">
                  In honour of {finalHonouredMember.name}
                </span>
              </div>
            )}

            {receiptNumber && (
              <p className="mt-3 font-mono text-xs text-muted">
                Receipt: {receiptNumber}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleWhatsAppShare}
                className="btn-lift flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700">
                <Share2 size={15} /> Share on WhatsApp
              </button>
              <button onClick={reset}
                className="btn-lift flex-1 rounded-full border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-muted hover:border-nobuk hover:text-nobuk">
                Give Again
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
