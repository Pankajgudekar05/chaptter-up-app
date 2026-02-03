import { supabase } from '../config/database.js';

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: { comments, count: comments.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments.',
      error: error.message
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.'
      });
    }

    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert([{
        post_id: postId,
        user_id: userId,
        content: content.trim()
      }])
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: { comment: newComment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment.',
      error: error.message
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.'
      });
    }

    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.'
      });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own comments.'
      });
    }

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully.',
      data: { comment: updatedComment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating comment.',
      error: error.message
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const { data: comment } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.'
      });
    }

    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', comment.post_id)
      .maybeSingle();

    const isCommentOwner = comment.user_id === userId;
    const isPostOwner = post && post.user_id === userId;

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments or comments on your posts.'
      });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment.',
      error: error.message
    });
  }
};
