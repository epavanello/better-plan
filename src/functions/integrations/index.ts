// Re-export all integration-related functions from the new modular structure
export { getIntegrations, deleteIntegration } from "./integration-management"
export { 
  getPlatformRequiresUserCredentials, 
  getUserPlatformStatus, 
  getUserAppCredentials, 
  saveUserAppCredentials, 
  deleteUserAppCredentials 
} from "./platform-credentials"