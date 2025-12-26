import express from 'express';
import { getAllUsers } from '../../../controllers/admin/userController';
import { setMaintenanceMode } from '../../../controllers/admin/systemController';
import upload from '../../../middlewares/uploadFile';
import { createPost, updatePost, deletePost } from '../../../controllers/admin/postController';
import {
  createProduct,
  //   deleteProduct,
  //   updateProduct,
} from '../../../controllers/admin/productController';

const router = express.Router();

// Route to get all users
router.get('/users', getAllUsers);
router.post('/maintenance', setMaintenanceMode);

// CRUD for posts
router.post('/posts', upload.single('image'), createPost);
router.patch('/posts', upload.single('image'), updatePost);
router.delete('/posts', deletePost);

// CRUD for products
router.post('/products', upload.array('images', 4), createProduct);
// router.patch('/products', upload.array('images', 4), updateProduct);
// router.delete('/products', deleteProduct);

export default router;
