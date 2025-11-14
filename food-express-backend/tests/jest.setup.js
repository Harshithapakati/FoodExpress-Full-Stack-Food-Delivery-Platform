// jest.setup.js - optional global setup, e.g. increase default timeout
jest.setTimeout(30000);

// Mock nodemailer so tests don't perform real SMTP calls or create background activity
jest.mock('nodemailer', () => ({
	createTransport: () => ({
		sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' })),
	}),
}));

// Prevent emailService from performing background sends after tests finish by stubbing sendOrderConfirmation
try {
	// require the module and replace the export with a no-op that resolves immediately
	// this ensures any fire-and-forget calls won't log after Jest teardown
	// eslint-disable-next-line global-require
	const emailService = require('../utils/emailService');
	if (emailService && typeof emailService.sendOrderConfirmation === 'function') {
		jest.spyOn(emailService, 'sendOrderConfirmation').mockImplementation(() => Promise.resolve(true));
	}
} catch (e) {
	// ignore if module can't be required at setup time
}
