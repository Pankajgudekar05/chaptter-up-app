import { supabase } from '../config/database.js';
import { generateOTP, hashPassword, isValidEmail } from '../utils/helpers.js';
import { sendOTPEmail } from '../utils/emailService.js';

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required.'
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await supabase
      .from('otps')
      .delete()
      .eq('email', email);

    const { data: otpRecord, error } = await supabase
      .from('otps')
      .insert([{
        email,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please check email configuration.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email.',
      data: {
        email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending OTP.',
      error: error.message
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.'
      });
    }

    const { data: otpRecord } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('verified', false)
      .maybeSingle();

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP.'
      });
    }

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      await supabase
        .from('otps')
        .delete()
        .eq('id', otpRecord.id);

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    await supabase
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        email,
        verified: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP.',
      error: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const { data: otpRecord } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('verified', true)
      .maybeSingle();

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unverified OTP. Please verify OTP first.'
      });
    }

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      await supabase
        .from('otps')
        .delete()
        .eq('id', otpRecord.id);

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        tokens: [],
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      throw updateError;
    }

    await supabase
      .from('otps')
      .delete()
      .eq('id', otpRecord.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting password.',
      error: error.message
    });
  }
};
