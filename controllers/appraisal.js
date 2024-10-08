const {Appraisal} = require("../models");

const createAppraisal = async (req, res, next) => {
  try {
    const {name, weight, criteriaId} = req.body;
    const createdAppraisal = await Appraisal.create({
      name,
      weight,
      CriterionId: criteriaId,
    });
    res.status(201).json(createdAppraisal);
  } catch (err) {
    next(err);
  }
};

const fetchAppraisals = async (req, res, next) => {
  try {
    const criteriaId = Number(req.query.criteriaId || 0);
    const limit = Number(req.query.limit || 10);
    const page = req.query.page >= 1 ? req.query.page : 1;
    const offset = (page - 1) * limit;

    let pagination = {
      limit,
      offset,
    };
    const where = {};
    if (limit === -1) {
      pagination = {};
    }
    if (criteriaId) {
      where.CriterionId = criteriaId;
    }

    const criteria = await Appraisal.findAndCountAll({
      ...pagination,
      where,
      order: [["weight", "ASC"]],
    });

    res.status(200).json(criteria);
  } catch (err) {
    next(err);
  }
};

const updateAppraisal = async (req, res, next) => {
  try {
    const {id} = req.params;
    const foundAppraisal = await Appraisal.findByPk(id);
    if (!foundAppraisal) throw {name: "Appraisal not found"};
    const {name, weight} = req.body;
    const appraisal = await Appraisal.update(
      {
        name,
        weight,
      },
      {where: {id}, returning: true, plain: true}
    );
    res.status(200).json(appraisal[1]);
  } catch (err) {
    next(err);
  }
};

const deleteAppraisal = async (req, res, next) => {
  try {
    const {id} = req.params;
    const appraisal = await Appraisal.findByPk(id);
    if (!appraisal) throw {name: "Appraisal not found"};
    await Appraisal.destroy({
      where: {id},
    });
    res.status(200).json({message: `Success delete appraisal with id ${id}`});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  deleteAppraisal,
  updateAppraisal,
  createAppraisal,
  fetchAppraisals,
};
