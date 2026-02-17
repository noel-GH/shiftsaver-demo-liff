import React, { useState, useEffect } from 'react';
import { UserPlus, User, Phone, ChevronRight, Loader2, Smile, CheckCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User as UserType, UserRole } from '../types';

interface RegisterViewProps {
  lineUserId: string;
  lineProfile?: { displayName: string; pictureUrl?: string } | null;
  onRegisterSuccess: (user: UserType) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ lineUserId, lineProfile, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState(lineProfile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update name if profile loads late
  useEffect(() => {
    if (lineProfile?.displayName && !fullName) {
      setFullName(lineProfile.displayName);
    }
  }, [lineProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!fullName.trim() || !phoneNumber.trim()) {
      setError("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Prepare User Data
      const newUserPayload = {
        line_user_id: lineUserId,
        display_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        role: UserRole.STAFF, // Default role
        reliability_score: 100, // Default score
        is_active: true,
        // Use LINE picture if available, otherwise generate one
        avatar_url: lineProfile?.pictureUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}` 
      };

      // 2. Insert into Supabase
      const { data, error: dbError } = await supabase
        .from('users')
        .insert([newUserPayload])
        .select()
        .single();

      if (dbError) {
        // Handle unique constraint violation (if user somehow registered in background)
        if (dbError.code === '23505') {
           // Instead of erroring, let's try to fetch the existing user and log them in
           const { data: existingUser } = await supabase
             .from('users')
             .select('*')
             .eq('line_user_id', lineUserId)
             .single();
             
           if (existingUser) {
             onRegisterSuccess(existingUser as UserType);
             return;
           }
           throw new Error("This LINE account is already registered but we couldn't retrieve your data.");
        }
        throw dbError;
      }

      // 3. Success Handler
      if (data) {
        onRegisterSuccess(data as UserType);
      }

    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white font-inter">
      
      {/* Welcome Header */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Welcome to ShiftSaver!</h1>
        <p className="text-indigo-100 max-w-xs mx-auto text-sm">
          Join the crew and start earning on your own schedule.
        </p>
      </div>

      {/* Profile Confirmation Card */}
      <div className="bg-white text-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* LINE Identity Section */}
        <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex flex-col items-center text-center">
           <div className="relative mb-3">
              <img 
                src={lineProfile?.pictureUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} 
                alt="Profile" 
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
              />
              <div className="absolute bottom-0 right-0 bg-green-500 p-1 rounded-full border-2 border-white">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
           </div>
           <h2 className="font-bold text-gray-900 text-lg">
             {lineProfile?.displayName || "New User"}
           </h2>
           <p className="text-xs text-indigo-400 font-medium bg-indigo-100 px-2 py-0.5 rounded-full mt-1">
             LINE Verified Account
           </p>
        </div>

        {/* Registration Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Phone Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex. 081-234-5678"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Complete Registration
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-indigo-200 text-xs opacity-70">
         <Smile className="w-4 h-4" />
         <span>Trusted by 150+ staff members</span>
      </div>
    </div>
  );
};