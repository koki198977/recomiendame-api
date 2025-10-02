export class DeleteAccountToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
