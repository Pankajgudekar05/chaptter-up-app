import { supabase } from '../config/database.js';

export const getLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || !['post', 'comment'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type parameter is required and must be either "post" or "comment".'
      });
    }

    if (type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found.'
        });
      }
    } else {
      const { data: comment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found.'
        });
      }
    }

    const { data: likes, error } = await supabase
      .from('likes')
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .eq('likeable_type', type)
      .eq('likeable_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: { likes, count: likes.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching likes.',
      error: error.message
    });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const userId = req.user.id;

    if (!type || !['post', 'comment'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type parameter is required and must be either "post" or "comment".'
      });
    }

    if (type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found.'
        });
      }
    } else {
      const { data: comment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found.'
        });
      }
    }

    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('likeable_type', type)
      .eq('likeable_id', id)
      .maybeSingle();

    if (existingLike) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Like removed successfully.',
        data: { liked: false }
      });
    } else {
      const { data: newLike, error } = await supabase
        .from('likes')
        .insert([{
          user_id: userId,
          likeable_type: type,
          likeable_id: id
        }])
        .select(`
          *,
          users:user_id (id, name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        message: 'Like added successfully.',
        data: { liked: true, like: newLike }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling like.',
      error: error.message
    });
  }
};
