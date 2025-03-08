const {Criterion, Appraisal, sequelize} = require("../models");

const createCriteria = async (req, res, next) => {
  try {
    const {name, weight, isBenefit} = req.body;
    const createdCriteria = await Criterion.create({
      name,
      weight,
      isBenefit,
    });
    res.status(201).json(createdCriteria);
  } catch (err) {
    next(err);
  }
};

const updateCriteria = async (req, res, next) => {
  try {
    const {id} = req.params;
    const foundCriteria = await Criterion.findByPk(id);
    if (!foundCriteria) throw {name: "Criteria not found"};
    const {name, weight, isBenefit} = req.body;
    const updatedCriteria = await Criterion.update(
      {
        name,
        weight,
        isBenefit,
      },
      {where: {id}, returning: true, plain: true}
    );
    res.status(200).json(updatedCriteria[1]);
  } catch (err) {
    next(err);
  }
};

const fetchCriterion = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 10);
    const page = req.query.page >= 1 ? Number(req.query.page) : 1;
    const offset = (page - 1) * limit;

    let pagination = {
      limit,
      offset,
    };

    if (limit === -1) {
      pagination = {};
    }

    // Count only Criterion records
    const count = await Criterion.count();

    // Fetch Criterion records with associated Appraisal records
    const rows = await Criterion.findAll({
      ...pagination,
      include: [
        {
          model: Appraisal,
        },
      ],
      order: [
        ["weight", "DESC"],
        [Appraisal, "weight", "ASC"],
      ],
    });

    res.status(200).json({
      count,
      totalPages: limit > 0 ? Math.ceil(count / limit) : 1,
      currentPage: page,
      rows,
    });
  } catch (err) {
    next(err);
  }
};

const fetchCriterionOnly = async (req, res, next) => {
  try {
    const withAppraisal = Boolean(req.query.withAppraisal);

    const include = [];
    const order = [["weight", "DESC"]];

    if (withAppraisal) {
      include.push({
        model: Appraisal,
      });
      order.push([Appraisal, "weight", "DESC"]);
    }

    const criterion = await Criterion.findAll({
      include,
      order,
    });

    res.status(200).json(criterion);
  } catch (err) {
    next(err);
  }
};

const fetchCriteriaById = async (req, res, next) => {
  try {
    const {id} = req.params;
    const criteria = await Criterion.findByPk(id, {
      include: [
        {
          model: Appraisal,
        },
      ],
      order: [[Appraisal, "weight", "ASC"]],
    });

    res.status(200).json(criteria);
  } catch (err) {
    next(err);
  }
};

const updateCriteriaWithAppraisals = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {id} = req.params; // Assume the criterion ID is passed as a URL parameter
    const {name, weight, appraisals = []} = req.body;

    // Find the existing criterion
    const criteria = await Criterion.findByPk(id);
    if (!criteria) {
      return res.status(404).json({error: "Criterion not found"});
    }

    // Update the criterion
    await criteria.update({name, weight}, {transaction: t});

    // Get the existing appraisals
    const existingAppraisals = await Appraisal.findAll({
      where: {CriterionId: id},
    });

    // Update, delete, and add appraisals
    const updatedAppraisals = appraisals.map(async (appraisal) => {
      if (appraisal.id) {
        // Update existing appraisal
        const existingAppraisal = existingAppraisals.find(
          (e) => e.id === appraisal.id
        );
        if (existingAppraisal) {
          return existingAppraisal.update(appraisal, {transaction: t});
        }
      } else {
        // Add new appraisal
        return Appraisal.create(
          {...appraisal, CriterionId: id},
          {transaction: t}
        );
      }
    });

    // Delete appraisals that were removed in the update
    const appraisalIdsToKeep = appraisals.filter((a) => a.id).map((a) => a.id);
    const appraisalsToDelete = existingAppraisals.filter(
      (existing) => !appraisalIdsToKeep.includes(existing.id)
    );
    await Promise.all(
      appraisalsToDelete.map((a) => a.destroy({transaction: t}))
    );

    // Wait for all updates/additions to finish
    await Promise.all(updatedAppraisals);

    await t.commit();

    res.status(200).json(criteria);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const deleteCriteria = async (req, res, next) => {
  try {
    const {id} = req.params;
    const criteria = await Criterion.findByPk(id);
    if (!criteria) throw {name: "Criterion not found"};
    await Criterion.destroy({
      where: {id},
    });
    res.status(200).json({message: `Success delete criteria with id ${id}`});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCriteria,
  fetchCriterion,
  fetchCriteriaById,
  deleteCriteria,
  updateCriteria,
  fetchCriterionOnly,
};
