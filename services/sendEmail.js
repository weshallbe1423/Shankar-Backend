// Simple email service using native Node.js
class EmailService {
  constructor() {
    // You can use Gmail SMTP or any other email service
  }

  async sendOTP(email, otp) {
    try {
      // For now, just log the OTP until you set up email service
      console.log(`📧 Email OTP for ${email}: ${otp}`);
      console.log('ℹ️  Set up email service in services/emailService.js');
      
      // Return success for development
      return { success: true, message: 'OTP logged to console' };
    } catch (error) {
      console.error('❌ Email OTP Error:', error.message);
      console.log(`📧 Manual Email OTP for ${email}: ${otp}`);
      throw new Error('Failed to send email OTP');
    }
  }

  // Optional: Method to set up real email service later
  async setupRealEmailService() {
    // You can implement this later with nodemailer or other services
    console.log('ℹ️  Real email service not configured yet');
  }
}

module.exports = new EmailService();