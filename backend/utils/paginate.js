/**
 * paginate.js
 * Offset pagination helpers for Mongoose queries and aggregation pipelines.
 */

/**
 * paginateQuery — applies skip/limit to a Mongoose query.
 * Returns { data, pagination }
 */
async function paginateQuery(Model, filter, options = {}, req) {
  const page  = Math.max(1, parseInt(req?.query?.page)  || 1);
  const limit = Math.min(100, parseInt(req?.query?.limit) || options.defaultLimit || 20);
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Model.find(filter)
      .select(options.select || '')
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * paginate(page, limit) — returns aggregation pipeline stages for skip/limit.
 * Usage: [...paginate(page, limit)] inside an aggregate() call.
 */
function paginate(page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  return [
    { $skip: skip },
    { $limit: Math.min(100, limit) },
  ];
}

module.exports = { paginate, paginateQuery };
