/**
 * Face verification service interface.
 *
 * The real implementation will call a backend endpoint running a pretrained
 * face-verification model (e.g. OpenCV / FaceNet). Raw frames are sent only
 * for comparison and are NEVER stored — neither here nor on the backend.
 *
 * Until that backend exists, `liveVerifier` reports that no model is connected,
 * and `demoVerifier` is a clearly labelled stand-in for demonstrations.
 */
export type VerificationResult = {
  status: "match" | "no_match" | "unavailable";
  confidence: number | null;
  method: "model" | "demo";
  durationMs: number;
};

export interface FaceVerifier {
  verify(medicalId: string, frame: Blob | null): Promise<VerificationResult>;
}

export const liveVerifier: FaceVerifier = {
  async verify() {
    const start = performance.now();
    // TODO: POST frame to backend /api/verify-face once the model is deployed.
    return {
      status: "unavailable",
      confidence: null,
      method: "model",
      durationMs: Math.round(performance.now() - start),
    };
  },
};

export const demoVerifier: FaceVerifier = {
  async verify(_medicalId, _frame) {
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 900));
    return {
      status: "match",
      confidence: null,
      method: "demo",
      durationMs: Math.round(performance.now() - start),
    };
  },
};
