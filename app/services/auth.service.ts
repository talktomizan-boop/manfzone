/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { supabase } from '~/lib/supabase.client';
import type { LoginCredentials, RegisterData, UserProfile } from '~/types/domain.types';
import { UnauthorizedError, ValidationError } from '~/types/domain.types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<UserProfile> {
    const { email, password, full_name, phone } = data;

    // Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
        },
      },
    });

    if (authError) {
      throw new ValidationError(authError.message);
    }

    if (!authData.user) {
      throw new ValidationError('Registration failed');
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      phone,
      role: 'customer',
      is_active: true,
      email_verified: false,
    });

    if (profileError) {
      throw profileError;
    }

    return {
      id: authData.user.id,
      email,
      full_name,
      phone: phone || null,
      avatar_url: null,
      role: 'customer',
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<UserProfile> {
    const { email, password } = credentials;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!data.user) {
      throw new UnauthorizedError('Login failed');
    }

    // Get user profile
    const profile = await this.getCurrentUserProfile();

    if (!profile) {
      throw new UnauthorizedError('Profile not found');
    }

    return profile;
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  /**
   * Get current user session
   */
  static async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  /**
   * Get current user profile
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const session = await this.getSession();

    if (!session) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url, role')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();

    return profile ? ['admin', 'super_admin'].includes(profile.role) : false;
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new ValidationError(error.message);
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new ValidationError(error.message);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const session = await this.getSession();

    if (!session) {
      throw new UnauthorizedError();
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone,
        avatar_url: data.avatar_url,
      })
      .eq('id', session.user.id);

    if (error) {
      throw error;
    }

    const updatedProfile = await this.getCurrentUserProfile();

    if (!updatedProfile) {
      throw new Error('Failed to fetch updated profile');
    }

    return updatedProfile;
  }
}
