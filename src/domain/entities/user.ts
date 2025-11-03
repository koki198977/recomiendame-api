export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly emailVerified: boolean,
    public readonly admin: boolean,
    public readonly createdAt: Date,
    public readonly birthDate?: Date,
    public readonly gender?: string,
    public readonly country?: string,
    public readonly language?: string,
    public readonly favoriteGenres?: string[],
    public readonly favoriteMedia?: string,
  ) {}
}
