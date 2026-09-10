// Carries the HTTP status alongside the error so callers can special-case a
// specific failure (409 "already booked") instead of showing one generic
// message for every kind of failure.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
