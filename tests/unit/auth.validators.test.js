'use strict';

const {
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} = require('../../src/modules/auth/auth.validators');

describe('auth.validators', () => {
  describe('LoginSchema', () => {
    test('accepts email + password (canonical mobile shape)', () => {
      const r = LoginSchema.parse({ email: 'al@ltraffic.co.uk', password: 'Test1234!' });
      expect(r.identifier).toBe('al@ltraffic.co.uk');
      expect(r.password).toBe('Test1234!');
      expect(r.deviceId).toBeNull();
    });
    test('accepts username + password', () => {
      const r = LoginSchema.parse({ username: 'admin', password: 'x' });
      expect(r.identifier).toBe('admin');
    });
    test('accepts explicit identifier field', () => {
      const r = LoginSchema.parse({ identifier: 'admin', password: 'x' });
      expect(r.identifier).toBe('admin');
    });
    test('normalises deviceId', () => {
      const r = LoginSchema.parse({ email: 'a@b.co', password: 'x', deviceId: '  d1  ' });
      expect(r.deviceId).toBe('d1');
    });
    test('rejects when neither username/email/identifier provided', () => {
      expect(() => LoginSchema.parse({ password: 'x' })).toThrow(/identifier/i);
    });
    test('rejects empty password', () => {
      expect(() => LoginSchema.parse({ email: 'a@b.co', password: '' })).toThrow();
    });
    test('rejects >200-char password (DoS guard)', () => {
      expect(() => LoginSchema.parse({ email: 'a@b.co', password: 'x'.repeat(201) })).toThrow();
    });
  });

  describe('RefreshSchema / LogoutSchema', () => {
    test('require refreshToken', () => {
      expect(() => RefreshSchema.parse({})).toThrow();
      expect(() => LogoutSchema.parse({})).toThrow();
    });
    test('accept non-empty token strings', () => {
      expect(RefreshSchema.parse({ refreshToken: 'abc' }).refreshToken).toBe('abc');
      expect(LogoutSchema.parse({ refreshToken: 'abc' }).refreshToken).toBe('abc');
    });
  });

  describe('ChangePasswordSchema', () => {
    test('accepts current + new (>=8 chars)', () => {
      const r = ChangePasswordSchema.parse({ currentPassword: 'x', newPassword: 'NewPass1!' });
      expect(r.newPassword).toBe('NewPass1!');
    });
    test('rejects newPassword <8', () => {
      expect(() => ChangePasswordSchema.parse({ currentPassword: 'x', newPassword: 'short' })).toThrow();
    });
    test('rejects newPassword >72 (bcrypt truncation guard)', () => {
      expect(() => ChangePasswordSchema.parse({ currentPassword: 'x', newPassword: 'a'.repeat(73) })).toThrow();
    });
  });

  describe('ForgotPasswordSchema', () => {
    test('lowercases and trims email', () => {
      const r = ForgotPasswordSchema.parse({ email: '  Al@LTraffic.CO.uk ' });
      expect(r.email).toBe('al@ltraffic.co.uk');
    });
    test('rejects malformed email', () => {
      expect(() => ForgotPasswordSchema.parse({ email: 'notanemail' })).toThrow();
    });
  });

  describe('ResetPasswordSchema', () => {
    test('accepts 32-char key + valid newPassword', () => {
      const r = ResetPasswordSchema.parse({ key: 'a'.repeat(32), newPassword: 'NewPass1!' });
      expect(r.key.length).toBe(32);
    });
    test('rejects non-32 key length', () => {
      expect(() => ResetPasswordSchema.parse({ key: 'short', newPassword: 'NewPass1!' })).toThrow();
      expect(() => ResetPasswordSchema.parse({ key: 'a'.repeat(33), newPassword: 'NewPass1!' })).toThrow();
    });
  });
});
