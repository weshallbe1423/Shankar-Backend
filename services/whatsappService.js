// Simple WhatsApp service using fetch API (no external dependencies)
class WhatsAppService {
  constructor() {
    // Using GreenAPI (Free: 100 messages/day)
    this.greenApi = {
      idInstance: process.env.GREENAPI_ID,
      apiTokenInstance: process.env.GREENAPI_TOKEN
    };
  }

  async sendOTP(phoneNumber, otp) {
    try {
      // Format phone number (remove + and spaces)
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      
      const message = `🎰 *Matka Analysis Tool*\n\nYour verification OTP is: *${otp}*\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`;
      
      // Using fetch instead of axios to avoid dependencies
      const response = await fetch(
        `https://api.green-api.com/waInstance${this.greenApi.idInstance}/sendMessage/${this.greenApi.apiTokenInstance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${formattedPhone}@c.us`,
            message: message
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📱 WhatsApp message sent to ${phoneNumber}`);
      return data;
    } catch (error) {
      console.error('❌ WhatsApp OTP Error:', error.message);
      // Fallback to console log for development
      console.log(`📱 Manual WhatsApp OTP for ${phoneNumber}: ${otp}`);
      throw new Error('Failed to send WhatsApp OTP');
    }
  }
}

module.exports = new WhatsAppService();