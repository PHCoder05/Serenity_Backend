import request from 'supertest';
import { APP_URL, SERENITY_DEMO_EMAIL, TESTER_EMAIL } from '../utils/constants';
import {
  loginAdmin,
  loginSerenityDemo,
  loginTester,
} from '../utils/serenity';

function expectOk(status: number) {
  expect([200, 201]).toContain(status);
}

describe('Serenity event waitlist', () => {
  const app = APP_URL;

  it('should waitlists the second guest and lets admin confirm after a seat frees', async () => {
    const { token: hostToken } = await loginSerenityDemo();
    const { token: guestToken } = await loginTester();
    const { token: adminToken } = await loginAdmin();

    const created = await request(app)
      .post('/api/v1/events')
      .auth(hostToken, { type: 'bearer' })
      .send({
        title: 'E2E Waitlist Table',
        subtitle: 'One seat',
        description: 'Fill then waitlist',
        dateLabel: '3 Oct 2026 · 7:00 PM · 1h',
        location: 'Counter',
        audience: 'internal',
        maxGuests: 1,
        waitlistEnabled: true,
      });
    expectOk(created.status);
    const eventId = created.body.id as string;
    expect(eventId).toBeDefined();

    const opened = await request(app)
      .patch(`/api/v1/admin/events/${eventId}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        status: 'registration-open',
        maxGuests: 1,
        waitlistEnabled: true,
        depositAmountInr: 0,
      });
    expectOk(opened.status);

    const first = await request(app)
      .post(`/api/v1/events/${eventId}/bookings`)
      .auth(hostToken, { type: 'bearer' })
      .send({
        name: 'Aarav',
        email: SERENITY_DEMO_EMAIL,
        phone: '9000000001',
        guestCount: 1,
      });
    expectOk(first.status);
    expect(first.body.status).toBe('confirmed');

    const waitlisted = await request(app)
      .post(`/api/v1/events/${eventId}/bookings`)
      .auth(guestToken, { type: 'bearer' })
      .send({
        name: 'John Doe',
        email: TESTER_EMAIL,
        phone: '9000000002',
        guestCount: 1,
      });
    expectOk(waitlisted.status);
    expect(waitlisted.body.status).toBe('waitlisted');
    const waitlistId = waitlisted.body.id as string;

    const full = await request(app).get(
      `/api/v1/events/${eventId}/availability`,
    );
    expect(full.status).toBe(200);
    expect(full.body.remainingSeats).toBe(0);
    expect(full.body.waitlistCount).toBe(1);

    const cancelled = await request(app)
      .post(
        `/api/v1/events/${eventId}/bookings/${first.body.id}/cancel`,
      )
      .auth(hostToken, { type: 'bearer' });
    expectOk(cancelled.status);
    expect(cancelled.body.status).toBe('cancelled');

    const confirmed = await request(app)
      .post(
        `/api/v1/admin/events/${eventId}/bookings/${waitlistId}/confirm`,
      )
      .auth(adminToken, { type: 'bearer' });
    expectOk(confirmed.status);
    expect(confirmed.body.status).toBe('confirmed');

    const after = await request(app).get(
      `/api/v1/events/${eventId}/availability`,
    );
    expect(after.status).toBe(200);
    expect(after.body.remainingSeats).toBe(0);
    expect(after.body.waitlistCount).toBe(0);
  });
});
