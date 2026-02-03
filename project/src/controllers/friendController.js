import { supabase } from '../config/database.js';

export const getFriends = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      throw error;
    }

    const friendIds = friendships.map(friendship =>
      friendship.user_id === userId ? friendship.friend_id : friendship.user_id
    );

    if (friendIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { friends: [], count: 0 }
      });
    }

    const { data: friends, error: friendsError } = await supabase
      .from('users')
      .select('id, name, email, gender, avatar')
      .in('id', friendIds);

    if (friendsError) {
      throw friendsError;
    }

    res.status(200).json({
      success: true,
      data: { friends, count: friends.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching friends.',
      error: error.message
    });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: pendingRequests, error } = await supabase
      .from('friendships')
      .select(`
        *,
        sender:user_id (id, name, email, avatar)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: { requests: pendingRequests, count: pendingRequests.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending requests.',
      error: error.message
    });
  }
};

export const toggleFriendship = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (userId === friendId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself.'
      });
    }

    const { data: friend } = await supabase
      .from('users')
      .select('id')
      .eq('id', friendId)
      .maybeSingle();

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (existingFriendship) {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', existingFriendship.id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Friendship removed successfully.',
        data: { action: 'removed' }
      });
    } else {
      const { data: newFriendship, error } = await supabase
        .from('friendships')
        .insert([{
          user_id: userId,
          friend_id: friendId,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        message: 'Friend request sent successfully.',
        data: { action: 'request_sent', friendship: newFriendship }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling friendship.',
      error: error.message
    });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "accept" or "reject".'
      });
    }

    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', friendId)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found.'
      });
    }

    if (action === 'accept') {
      const { data: updatedFriendship, error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', friendship.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Friend request accepted.',
        data: { friendship: updatedFriendship }
      });
    } else {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendship.id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Friend request rejected.',
        data: { action: 'rejected' }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error responding to friend request.',
      error: error.message
    });
  }
};
