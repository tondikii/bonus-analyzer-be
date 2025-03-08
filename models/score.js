"use strict";
const {Model} = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Score extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Score.belongsTo(models.Performance);
      Score.belongsTo(models.Criterion, {
        foreignKey: {
          name: "CriterionId",
        },
      });
    }
  }
  Score.init(
    {
      PerformanceId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        validate: {notNull: {msg: "PerformanceId is required"}},
      },
      CriterionId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        validate: {notNull: {msg: "CriterionId is required"}},
      },
      score: {
        allowNull: false,
        type: DataTypes.INTEGER,
        validate: {notNull: {msg: "score is required"}},
      },
      period: {
        allowNull: false,
        type: DataTypes.DATE,
        validate: {
          notNull: {msg: "period is required"},
        },
      },
    },
    {
      sequelize,
      modelName: "Score",
    }
  );
  return Score;
};
