export const checkUserExists = (exitUser: any) => {
  if (exitUser) {
    const error: any = new Error('User already exists with this phone number');
    error.status = 400; // Bad Request
    error.code = 'USER_EXISTS';
    throw error; // This will be caught by the error handling middleware
  }
};
