import { supabase } from '../config/database.js';

export const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { data: newPost, error } = await supabase
      .from('posts')
      .insert([{
        user_id: userId,
        caption: caption || null,
        image_url: imageUrl
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
      message: 'Post created successfully.',
      data: { post: newPost }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating post.',
      error: error.message
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (id, name, email, avatar)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const postsWithCounts = await Promise.all(posts.map(async (post) => {
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('likeable_type', 'post')
        .eq('likeable_id', post.id);

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      return {
        ...post,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0
      };
    }));

    res.status(200).json({
      success: true,
      data: { posts: postsWithCounts, count: postsWithCounts.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching posts.',
      error: error.message
    });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (id, name, email, avatar)
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('likeable_type', 'post')
      .eq('likeable_id', post.id);

    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    post.likes_count = likesCount || 0;
    post.comments_count = commentsCount || 0;

    res.status(200).json({
      success: true,
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching post.',
      error: error.message
    });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (id, name, email, avatar)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const postsWithCounts = await Promise.all(posts.map(async (post) => {
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('likeable_type', 'post')
        .eq('likeable_id', post.id);

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      return {
        ...post,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0
      };
    }));

    res.status(200).json({
      success: true,
      data: { posts: postsWithCounts, count: postsWithCounts.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user posts.',
      error: error.message
    });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;
    const userId = req.user.id;

    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own posts.'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (caption !== undefined) updateData.caption = caption;
    if (req.file) updateData.image_url = `/uploads/${req.file.filename}`;

    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
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
      message: 'Post updated successfully.',
      data: { post: updatedPost }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating post.',
      error: error.message
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts.'
      });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting post.',
      error: error.message
    });
  }
};
