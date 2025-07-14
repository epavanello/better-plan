// Re-export all post-related functions from the new modular structure
export { createPost } from "./posts/create-post"
export { getRecentDestinations, createDestinationFromInput } from "./posts/destinations"
export { getPosts, deletePost } from "./posts/post-management"
export { fetchRecentSocialPosts } from "./posts/recent-posts"
