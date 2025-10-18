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
}

export default MeasurementController;