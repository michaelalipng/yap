export function isAuthorized(searchToken: string | null): boolean {
  console.log('Token validation called with:', searchToken)
  
  if (!searchToken) {
    console.log('No token provided')
    return false
  }
  
  // For now, accept any token for testing
  console.log('Token accepted for testing')
  return true
}
