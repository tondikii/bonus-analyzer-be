const {
  calculatePerformanceScore,
  calculateNormalization,
  addDaysToDate,
} = require("../helpers/utils");

const {
  PerformanceReport,
  Performance,
  Score,
  Criterion,
  Employee,
} = require("../models");

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const createPerformanceReport = async (req, res, next) => {
  try {
    const {period, performances} = req.body;

    // Create Performance Report
    const performanceReport = await PerformanceReport.create({period});

    const criterion = await Criterion.findAll({order: [["weight", "DESC"]]});

    const performancesWithFinalScore = calculatePerformanceScore({
      performances,
      criterion,
    });

    // Create Performances and Scores
    for (const performance of performancesWithFinalScore) {
      const {employeeId, finalScore} = performance;
      const scores =
        performances.find((e) => e?.employeeId === employeeId)?.scores || [];
      const createdPerformance = await Performance.create({
        PerformanceReportId: performanceReport.id,
        EmployeeId: employeeId,
        finalScore,
      });

      for (const score of scores) {
        await Score.create({
          PerformanceId: createdPerformance.id,
          CriterionId: score.criterionId,
          score: score.score,
          period,
        });
      }
    }

    return res
      .status(201)
      .json({message: "Performance report created successfully"});
  } catch (err) {
    next(err);
  }
};

const fetchPerformanceReport = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10; // limit length of the products
    const page = req.query.page >= 1 ? req.query.page : 1;
    const offset = (page - 1) * limit; // indeks start from

    const where = {};

    const createdPerformanceReport = await PerformanceReport.findAndCountAll({
      limit,
      offset,
      where,
      include: [
        {
          model: Performance,
          include: [
            {
              model: Employee,
            },
          ],
        },
      ],
      order: [
        ["period", "DESC"],
        [Performance, "finalScore", "DESC"],
      ],
    });

    res.status(200).json(createdPerformanceReport);
  } catch (err) {
    next(err);
  }
};

const deletePerformanceReport = async (req, res, next) => {
  try {
    const {id} = req.params;

    const foundPerformanceReport = await PerformanceReport.findByPk(id);

    if (!foundPerformanceReport) throw {name: "PerformanceReport not found"};

    await PerformanceReport.destroy({
      where: {id},
    });

    res.status(200).json({message: `Success delete employee with id ${id}`});
  } catch (err) {
    next(err);
  }
};

const downloadPerformanceReport = async (req, res, next) => {
  try {
    const {id} = req.params;

    // Ambil data dari database
    const report = await PerformanceReport.findByPk(id, {
      include: [
        {
          model: Performance,
          include: [
            {
              model: Employee,
            },
            {
              model: Score,
            },
          ],
        },
      ],
    });

    const period = addDaysToDate(new Date(report?.period), 1);

    const performances = report?.Performances || [];

    if (!report) {
      throw {name: "PerformanceReport not found"};
    }

    const criterion = await Criterion.findAll({order: [["weight", "DESC"]]});

    const normalizedMatrixWithWeight = calculateNormalization({
      performances,
      criterion,
    });

    const headerNormalizationCriteria = [
      "Nomor",
      "Nama Karyawan",
      ...criterion.map(
        (c) => `${c.name} (${c.weight}%) (${c.isBenefit ? "Benefit" : "Cost"})`
      ),
    ];

    // **1. Buat Normalisasi Kriteria**
    const workSheetData = [
      ["", "", "", "Normalisasi Kriteria"],
      ["", ""],
      headerNormalizationCriteria,
    ];

    normalizedMatrixWithWeight.forEach((e, idx) => {
      workSheetData.push([
        idx + 1,
        e?.[0]?.employeeName,
        ...e.map((f) => Number(f?.normalizedValue).toFixed(4)),
      ]);
    });

    workSheetData.push(["", ""]);
    workSheetData.push(["", ""]);
    workSheetData.push(["", ""]);

    // **2. Pembobotan Kriteria**
    workSheetData.push(
      ["", "", "", "Pembobotan Kriteria"],
      ["", ""],
      headerNormalizationCriteria
    );

    normalizedMatrixWithWeight.forEach((e, idx) => {
      workSheetData.push([
        idx + 1,
        e?.[0]?.employeeName,
        ...e.map((f) => Number(f?.normalizedWeight).toFixed(4)),
      ]);
    });

    workSheetData.push(["", ""]);
    workSheetData.push(["", ""]);
    workSheetData.push(["", ""]);

    // **3. Tambah Perankingan**
    const rankingHeader = ["Nomor", "Nama Karyawan", "Ranking", "Hasil"];
    workSheetData.push(["", "Perangkingan Karyawan"], ["", ""], rankingHeader);

    performances.forEach((e, idx) => {
      workSheetData.push([
        idx + 1,
        e?.Employee?.name,
        idx + 1,
        Number(e?.finalScore).toFixed(4),
      ]);
    });

    // **4. Buat Sheet dan Workbook**
    const ws = XLSX.utils.aoa_to_sheet(workSheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Report");

    const fileName = `Performance_Report_${new Date(
      period.toString()
    ).getFullYear()}.xlsx`;

    // **5. Simpan File**
    const filePath = path.join(__dirname, fileName);
    XLSX.writeFile(wb, filePath);

    // **6. Kirim File ke Client**
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error(err);
        next(err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

module.exports = {
  createPerformanceReport,
  fetchPerformanceReport,
  deletePerformanceReport,
  downloadPerformanceReport,
};
