// /routes/rankings.js
import express from 'express';
import { getPopularRestaurants, getPopularMenuItems,getRestaurantsWithTopMenuItem } from '../controllers/rankings.js';

const router = express.Router();

router.get('/restaurants', getPopularRestaurants);   // GET /rankings/restaurants
router.get('/menu-items', getPopularMenuItems);     // GET /rankings/menu-items
router.get('/restaurants/with-top-menu', getRestaurantsWithTopMenuItem)

export default router;
