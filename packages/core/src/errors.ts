export class JambonzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JambonzError';
  }
}

export class RegistrationError extends JambonzError {
  public readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'RegistrationError';
    this.code = code;
  }
}

export class CallError extends JambonzError {
  public readonly code?: number;
  public readonly reason?: string;

  constructor(message: string, code?: number, reason?: string) {
    super(message);
    this.name = 'CallError';
    this.code = code;
    this.reason = reason;
  }
}

export class ConnectionError extends JambonzError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}
