export class PasswordResetToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
  ) {}

  isExpired(currentDate: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= currentDate.getTime();
  }
}
