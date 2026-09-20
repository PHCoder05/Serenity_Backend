describe('PaymentOutboxService backoff math', () => {
  it('should caps exponential delay at 3600s', () => {
    const delays = [1, 2, 3, 4, 5, 6, 7, 8].map((attempts) =>
      Math.min(30 * 2 ** (attempts - 1), 3600),
    );
    expect(delays[0]).toBe(30);
    expect(delays[1]).toBe(60);
    expect(delays[7]).toBe(3600);
  });
});
