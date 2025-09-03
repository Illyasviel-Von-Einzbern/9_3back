// controllers/rankings.js
import Menu from '../models/menu.js';
import Restaurant from '../models/restaurant.js';

export const getPopularRestaurants = async (req, res, next) => {
  try {
    const grade = req.query.grade; // optional，例如 ?grade=資訊組
    let query = { isDeleted: false };
    let sortField = 'totalGroups';

    if (grade) {
      query[`group_stats.${grade}`] = { $gt: 0 }; // 只取有紀錄的
      sortField = `group_stats.${grade}`;
    }

    const restaurants = await Restaurant.find(query)
      .sort({ [sortField]: -1 })
      .limit(10)
      .select('name image category totalGroups group_stats'); // 想秀什麼欄位可以加

    res.status(200).json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};


export const getPopularMenuItems = async (req, res, next) => {
  try {
    const grade = req.query.grade; // ex: "三年級" or "資訊組"

    let query = { isDeleted: false };
    let sortField = 'totalOrders';

    if (grade) {
      query[`order_stats.${grade}`] = { $gt: 0 }; // 只找有該部門紀錄的
      sortField = `order_stats.${grade}`;
    }

    const items = await Menu.find(query)
      .sort({ [sortField]: -1 })
      .limit(10)
      .populate('restaurant', 'name');

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantsWithTopMenuItem = async (req, res, next) => {
  try {
    const grade = req.query.grade // e.g. 三年級

    const restaurants = await Restaurant.find({ isDeleted: false })
      .sort({ totalGroups: -1 }) // 可以改成你想要的排序
      .limit(10)

    const result = []

    for (const restaurant of restaurants) {
      const menuQuery = {
        restaurant: restaurant._id,
        isDeleted: false,
      }

      const sortField = grade ? `order_stats.${grade}` : 'totalOrders'

      const topMenuItem = await Menu.findOne(menuQuery)
        .sort({ [sortField]: -1 })
        .select('name price image totalOrders order_stats')

      result.push({
        _id: restaurant._id,
        name: restaurant.name,
        image: restaurant.image,
        totalGroups: restaurant.totalGroups,
        mostPopularMenu: topMenuItem,
      })
    }

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

