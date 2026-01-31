"use client";

import { useState, useEffect } from "react";
import { followUser, unfollowUser, isFollowing } from "@/lib/friendships";

interface FollowButtonProps {
  targetUserId: string;
  targetUserName?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  targetUserId,
  targetUserName,
  size = "md",
  variant = "primary",
  onFollowChange
}: FollowButtonProps) {
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verificar status inicial
  useEffect(() => {
    const checkFollowStatus = async () => {
      setChecking(true);
      const following = await isFollowing(targetUserId);
      setIsFollowingState(following);
      setChecking(false);
    };

    checkFollowStatus();
  }, [targetUserId]);

  const handleToggleFollow = async () => {
    if (loading) return;

    setLoading(true);
    try {
      let success = false;

      if (isFollowingState) {
        const result = await unfollowUser(targetUserId);
        success = result.success;
        if (success) {
          setIsFollowingState(false);
          onFollowChange?.(false);
        }
      } else {
        const result = await followUser(targetUserId);
        success = result.success;
        if (success) {
          setIsFollowingState(true);
          onFollowChange?.(true);
        }
      }

      if (!success) {
        // Reverter estado em caso de erro
        setIsFollowingState(!isFollowingState);
      }
    } catch (error) {
      console.error("Erro ao alterar status de seguir:", error);
      // Reverter estado em caso de erro
      setIsFollowingState(!isFollowingState);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantClasses = {
    primary: isFollowingState
      ? "bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300"
      : "bg-green-600 text-white hover:bg-green-700",
    secondary: isFollowingState
      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
      : "bg-blue-600 text-white hover:bg-blue-700"
  };

  if (checking) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} rounded-full font-medium transition-colors opacity-50 cursor-not-allowed`}
      >
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mx-auto"></div>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mx-auto"></div>
      ) : isFollowingState ? (
        "Seguindo"
      ) : (
        "Seguir"
      )}
    </button>
  );
}