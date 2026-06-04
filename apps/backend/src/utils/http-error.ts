export class HttpError extends Error {
  readonly statusCode: number;

  constructor(messageOrStatusCode: string | number, statusCodeOrMessage: number | string = 400) {
    const message =
      typeof messageOrStatusCode === "number"
        ? String(statusCodeOrMessage)
        : messageOrStatusCode;
    const statusCode =
      typeof messageOrStatusCode === "number"
        ? messageOrStatusCode
        : typeof statusCodeOrMessage === "number"
          ? statusCodeOrMessage
          : 400;

    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}
