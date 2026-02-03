import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, gender, avatar')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.'
      });
    }

    const { data: tokenCheck } = await supabase
      .from('users')
      .select('tokens')
      .eq('id', user.id)
      .maybeSingle();

    if (tokenCheck && tokenCheck.tokens && !tokenCheck.tokens.includes(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please login again.'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message
    });
  }
};
