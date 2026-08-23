import axios from 'axios';
import { prisma } from '../src/db.js';
async function runConcurrencyTest() {
    console.log('--- Starting Concurrency Test ---');
    let token = '';
    let showId = '';
    let seatId = '';
    try {
        const email = `test_concurrency_${Date.now()}@example.com`;
        const res = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test Concurrency', email, password: 'password123', role: 'CUSTOMER'
        });
        // Register doesn't return token — login to get one
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', { email, password: 'password123' });
        token = loginRes.data.token;
        const availableSeat = await prisma.seatStatus.findFirst({ where: { status: 'AVAILABLE' } });
        if (!availableSeat) {
            console.log('No available seats found.');
            return;
        }
        showId = availableSeat.showId;
        seatId = availableSeat.seatId;
        console.log(`Targeting Show: ${showId}, Seat: ${seatId}`);
    }
    catch (error) {
        console.error('Setup failed', error);
        return;
    }
    const CONCURRENCY_LEVEL = 10;
    console.log(`Firing ${CONCURRENCY_LEVEL} simultaneous hold requests...`);
    const requests = Array.from({ length: CONCURRENCY_LEVEL }, () => axios.post(`http://localhost:5000/api/shows/${showId}/seats/${seatId}/hold`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => ({ status: 'success', data: res.data }))
        .catch(err => ({ status: 'error', statusCode: err.response?.status, data: err.response?.data })));
    const results = await Promise.all(requests);
    const successes = results.filter(r => r.status === 'success');
    const conflicts = results.filter(r => r.status === 'error' && r.statusCode === 409);
    const others = results.filter(r => r.status === 'error' && r.statusCode !== 409);
    console.log('--- Results ---');
    console.log(`Successes (200): ${successes.length}`);
    console.log(`Conflicts (409): ${conflicts.length}`);
    console.log(`Other errors:    ${others.length}`);
    if (successes.length === 1 && conflicts.length === CONCURRENCY_LEVEL - 1) {
        console.log('✅ TEST PASSED: Exactly one hold succeeded, rest blocked with 409.');
    }
    else {
        console.log('❌ TEST FAILED: Unexpected result distribution.');
    }
    try {
        await axios.delete(`http://localhost:5000/api/shows/${showId}/seats/${seatId}/hold`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Cleanup: hold released.');
    }
    catch {
        console.log('Cleanup skipped.');
    }
}
runConcurrencyTest().finally(() => prisma.$disconnect());
//# sourceMappingURL=concurrency.test.js.map