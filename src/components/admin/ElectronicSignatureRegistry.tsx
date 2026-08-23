import React, { useState, useEffect, useRef } from "react";
import {
  PenTool,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  RefreshCcw,
  UserCheck,
  X,
  FileCheck,
  Eye,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ElectronicSignature,
  getRegisteredSignatures,
  saveEmployeeSignature,
  authenticateAndGetSignature,
  generateDefaultSignatureSvg,
  fetchSignaturesFromSupabase,
} from "@/lib/electronicSignatures";

export function ElectronicSignatureRegistry() {
  const [signatures, setSignatures] = useState<ElectronicSignature[]>([]);
  const [selectedMember, setSelectedMember] = useState<ElectronicSignature | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Authentication Test Widget state
  const [testEmpNumber, setTestEmpNumber] = useState("688079");
  const [authResult, setAuthResult] = useState<ElectronicSignature | null>(null);
  const [authError, setAuthError] = useState(false);

  // Canvas Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");

  const loadAllSignatures = () => {
    setSignatures(getRegisteredSignatures());
  };

  useEffect(() => {
    loadAllSignatures();
    fetchSignaturesFromSupabase().then((data) => {
      if (data && data.length > 0) setSignatures(data);
    });
    window.addEventListener("sakthi_signatures_updated", loadAllSignatures);
    return () => window.removeEventListener("sakthi_signatures_updated", loadAllSignatures);
  }, []);

  // Handle Authentication test search
  const handleTestAuthentication = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    const authenticated = authenticateAndGetSignature(testEmpNumber);
    if (authenticated) {
      setAuthResult(authenticated);
      toast.success(`Employee Number #${testEmpNumber} Authenticated! E-Signature fetched.`);
    } else {
      setAuthResult(null);
      setAuthError(true);
      toast.error(`Invalid Employee Number #${testEmpNumber}. Check employee directory ID.`);
    }
  };

  // Open modal to update signature for a member
  const handleOpenUpdateModal = (member: ElectronicSignature) => {
    setSelectedMember(member);
    setIsModalOpen(true);
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  // Canvas clear
  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Start Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  // Draw Stroke
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  // Stop Drawing
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Save drawn canvas signature
  const handleSaveCanvasSignature = () => {
    if (!selectedMember || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    saveEmployeeSignature(selectedMember.employee_number, dataUrl);
    setIsModalOpen(false);
    toast.success(`Electronic Signature updated for Emp #${selectedMember.employee_number} (${selectedMember.employee_name})!`);
  };

  // File Upload signature
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        saveEmployeeSignature(selectedMember.employee_number, dataUrl);
        setIsModalOpen(false);
        toast.success(`Signature file uploaded for Emp #${selectedMember.employee_number}!`);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-brand" /> Official Employee Electronic Signature Directory & Authentication Database
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Centralized E-signature database for registered employees. Authenticate employee numbers, view e-signatures, and grant audit approval access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            9 Employees Registered
          </span>
        </div>
      </div>

      {/* SECTION 1: AUTHENTICATION TEST & SIGNATURE ACCESS WIDGET */}
      <div className="rounded-xl border border-brand/30 bg-gradient-to-r from-orange-50/50 via-white to-emerald-50/50 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" /> Employee Number Authentication & E-Signature Access
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Enter any registered employee number (e.g. 690867, 688079) to authenticate identity and access their registered E-signature image.
            </p>
          </div>
        </div>

        <form onSubmit={handleTestAuthentication} className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={testEmpNumber}
              onChange={(e) => setTestEmpNumber(e.target.value)}
              placeholder="Enter Emp # (e.g. 690867, 688079)..."
              className="h-9 border-slate-300 pl-9 font-mono text-xs font-bold text-slate-900 bg-white"
            />
          </div>

          <Button type="submit" size="sm" className="bg-brand font-bold text-white hover:bg-brand-hover gap-1.5 shadow-xs">
            <ShieldCheck className="h-4 w-4" /> Authenticate Number
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTestEmpNumber("688079");
              setAuthResult(authenticateAndGetSignature("688079"));
            }}
            className="border-slate-300 bg-white text-slate-700 font-semibold text-xs gap-1"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Sample Emp #688079
          </Button>
        </form>

        {/* Authentication Result Display Card */}
        {authResult && (
          <div className="rounded-xl border border-emerald-300 bg-white p-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                    AUTHENTICATED
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{authResult.employee_name}</h4>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Emp #{authResult.employee_number} · {authResult.designation} ({authResult.department})
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Access Status: Granted for Audit Sign-Off
                </p>
              </div>

              {/* Authenticated E-Signature Image Stamp */}
              <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-center shadow-xs min-w-[200px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Authenticated Signature
                </span>
                <img
                  src={authResult.signature_url || generateDefaultSignatureSvg(authResult.employee_name)}
                  alt={`E-signature for ${authResult.employee_name}`}
                  className="h-14 max-w-[180px] object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {authError && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
            Authentication Error: Employee Number #{testEmpNumber} is not in the 10 registered members database.
          </div>
        )}
      </div>

      {/* SECTION 2: 10 MEMBERS SIGNATURE DIRECTORY CARD GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-emerald-600" /> Registered 10 Member E-Signature Database
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Click 'Update / Upload Sign' to modify any member's signature file.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {signatures.map((member) => (
            <div
              key={member.employee_number}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-brand/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                    Emp #{member.employee_number}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={member.employee_name}>
                    {member.employee_name}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 truncate" title={member.designation}>
                    {member.designation}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{member.department}</p>
                </div>

                {/* E-Signature Image Container */}
                <div className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                  <img
                    src={member.signature_url || generateDefaultSignatureSvg(member.employee_name)}
                    alt={`Signature ${member.employee_name}`}
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenUpdateModal(member)}
                  className="w-full h-7 text-[11px] font-bold border-slate-300 bg-white text-slate-800 hover:bg-slate-100 gap-1"
                >
                  <PenTool className="h-3 w-3 text-brand" /> Update / Upload Sign
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: UPLOAD / DRAW SIGNATURE MODAL */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-brand/10 p-2 text-brand">
                  <PenTool className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Electronic Signature — Emp #{selectedMember.employee_number}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedMember.employee_name}</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("draw")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                    activeTab === "draw"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                    activeTab === "upload"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload Image File
                </button>
              </div>

              {activeTab === "draw" ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-slate-300 bg-white p-1">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full cursor-crosshair rounded-lg bg-white touch-none"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute right-3 top-3 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 flex items-center gap-1"
                    >
                      <Eraser className="h-3 w-3" /> Clear
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Use your mouse or touchscreen to draw the signature inside the box above.
                  </p>

                  <Button
                    onClick={handleSaveCanvasSignature}
                    className="w-full bg-brand font-bold text-white hover:bg-brand-hover"
                  >
                    Save Drawn Signature
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-brand" />
                    <p className="text-xs font-bold text-slate-800">Select Signature Image File</p>
                    <p className="text-[11px] text-slate-500">Supports PNG, JPG, JPEG, SVG format</p>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="mt-2 text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand file:text-white hover:file:bg-brand-hover cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
