import MeasurementModel from "../models/measurement.model.js";
// Giả định bạn có một tiện ích toMsg để định dạng lỗi
// import { toMsg } from "../utils/errorFormatter"; 

class MeasurementController {
  // GET /users/:userId/measurements
  // Hoặc chỉ GET /measurements nếu lấy tất cả (tùy thuộc vào logic của bạn)
  async listAllMeasurements(req, res) {
    // Lấy userId từ params nếu API là /users/:userId/measurement

    try {
      // Gọi phương thức từ Model để lấy dữ liệu
      // Tôi dùng userId ở đây để làm theo khuôn mẫu của ProgramController
      MeasurementModel.listAllMeasurements( (error, result) => {
        if (error) {
          // Xử lý lỗi từ database hoặc model
          // Thay thế toMsg(error) bằng hàm của bạn nếu có, hoặc dùng error.message
          return res.status(400).json({ error: error.message || "Lỗi khi truy vấn dữ liệu Measurement." });
        }
        
        // Trả về danh sách measurement thành công
        return res.status(200).json({ measurements: result });
      });
    } catch (error) {
      // Xử lý lỗi hệ thống (ví dụ: lỗi kết nối, lỗi code không mong muốn)
      return res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ." });
    }
  }

  // GET /coaches/:coachId/athletes
  async listAthletesOfCoach(req, res) {
    const { coachId } = req.params;

    try {
      MeasurementModel.listAtheleteOfACoach(coachId, (error, result) => {
        if (error) {
          return res.status(400).json({ error: error.message || "Lỗi khi truy vấn dữ liệu vận động viên." });
        }

        return res.status(200).json({ athletes: result });
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ." });
    }
  }

async setNewRecord(req, res) {
    const measurementData = req.body;
    const { athleteId, measurementId, value } = measurementData;

    // --- 1. Validation (Kiểm tra dữ liệu đầu vào) ---
    // Rất quan trọng để tránh lỗi
    if (!athleteId || !measurementId || value === undefined || value === null) {
        return res.status(400).json({ 
            error: "Dữ liệu không hợp lệ. Vui lòng cung cấp athleteId, measurementId, và value." 
        });
    }

    try {
        // --- 2. Gọi Model (với callback) ---
        MeasurementModel.setNewRecord(measurementData, (error, result) => {
            
            // --- 3. Xử lý lỗi từ Model Callback ---
            if (error) {
                // Lỗi này là lỗi từ CSDL (ví dụ: pool.query thất bại)
                console.error('Lỗi từ MeasurementModel:', error);
                return res.status(500).json({ error: "Lỗi khi thêm bản ghi đo lường." });
            }

            // --- 4. Xử lý Logic (Quan trọng) ---
            // Query INSERT...SELECT có thể chạy thành công (error = null)
            // nhưng không chèn hàng nào (affectedRows = 0)
            // nếu không tìm thấy 'measurementId' trong bảng 'measurements'.
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    error: `Không tìm thấy 'measurement' với ID: ${measurementId}. Không có dữ liệu nào được thêm.` 
                });
            }

            // --- 5. Xử lý Thành công ---
            return res.status(201).json({ 
                message: "Thêm bản ghi đo lường thành công.", 
                recordId: result.insertId 
            });
        });

    } catch (syncError) {
        // --- 6. Xử lý lỗi đồng bộ ---
        // Bắt các lỗi xảy ra *bên ngoài* callback
        // (Ví dụ: MeasurementModel.setNewRecord không phải là hàm)
        console.error('Lỗi đồng bộ trong controller:', syncError);
        return res.status(500).json({ error: "Lỗi máy chủ nội bộ." });
    }
}
async getTeamLeaderboard(req, res) {
    try {
        // Lấy coachId từ URL, ví dụ: /api/measurements/leaderboard/some-coach-id
        const { coachId } = req.params; 
        
        if (!coachId) {
            return res.status(400).json({ error: "Thiếu coachId." });
        }

        // 1. Lấy dữ liệu phẳng (flat data) từ Model
        const flatLeaderboard = await MeasurementModel.getTeamLeaderboard(coachId);

        if (flatLeaderboard.length === 0) {
            // Không có dữ liệu không phải là lỗi
            return res.status(200).json([]); 
        }

        // 2. Nhóm dữ liệu (Grouping)
        // Chuyển từ mảng phẳng -> mảng có cấu trúc lồng nhau
        const groupedLeaderboard = [];
        let currentMeasurement = null;

        flatLeaderboard.forEach(row => {
            // Nếu đây là measurement đầu tiên, hoặc là measurement mới
            if (!currentMeasurement || currentMeasurement.measurement_id !== row.measurement_id) {
                // Tạo một nhóm measurement mới
                currentMeasurement = {
                    measurement_id: row.measurement_id,
                    measurement_name: row.measurement_name,
                    unit: row.imperial_unit,
                    rankings: [] // Mảng chứa các athlete
                };
                groupedLeaderboard.push(currentMeasurement);
            }
            
            // Thêm athlete vào nhóm measurement hiện tại
            currentMeasurement.rankings.push({
                rank: currentMeasurement.rankings.length + 1, // Tạo rank
                first_name: row.first_name,
                last_name: row.last_name,
                result: row.best_result
            });
        });

        // 3. Trả về kết quả đã nhóm
        return res.status(200).json(groupedLeaderboard);

    } catch (error) {
        return res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ." });
    }
}
async getAthleteProgress(req, res) {
    try {
        const { athleteId, measurementId } = req.params;

        if (!athleteId || !measurementId) {
            return res.status(400).json({ error: "Thiếu athleteId hoặc measurementId." });
        }

        // 1. Lấy lịch sử (đã sắp xếp MỚI NHẤT -> CŨ NHẤT)
        const history = await MeasurementModel.getAthleteProgress(athleteId, measurementId);

        // 2. Xử lý trường hợp không có dữ liệu
        if (history.length === 0) {
            return res.status(200).json({
                summary: {
                    latestResult: null,
                    firstResult: null,
                    totalChange: null,
                    unit: null
                },
                history: [] // Trả về mảng rỗng
            });
        }

        // 3. Tính toán dữ liệu tóm tắt (summary)
        
        // Mới nhất là phần tử đầu tiên (index 0)
        const latestEntry = history[0];
        // Cũ nhất (lần đầu tiên) là phần tử cuối cùng
        const firstEntry = history[1]; 

        // Giả định: 'result' là một con số (ví dụ: 5999).
        // 'Total Change' là sự chênh lệch giữa lần đầu và lần mới nhất.
        // (Đối với thời gian, 'first' - 'latest' > 0 là tiến bộ)
        const totalChange = Math.abs(firstEntry.result - latestEntry.result);

        const summary = {
            latestResult: latestEntry.result,
            firstResult: firstEntry.result,
            totalChange: totalChange,
            unit: latestEntry.unit // Lấy unit từ bản ghi mới nhất
        };

        // 4. Trả về cả tóm tắt và lịch sử chi tiết
        return res.status(200).json({
            summary: summary,
            history: history // Toàn bộ lịch sử (để vẽ biểu đồ và "Recent Tests")
        });

    } catch (error) {
        return res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ." });
    }
}
}

export default MeasurementController;