// Re-export all post-related functions from the new modular structure
export { createPost } from "./create-post"
export { getRecentDestinations, createDestinationFromInput } from "./destinations"
export { getPosts, deletePost } from "./post-management"
export { fetchRecentSocialPosts } from "./recent-posts"