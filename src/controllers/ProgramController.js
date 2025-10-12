import ProgramModel from "../models/program.model.js";

class ProgramController {
    async listAllProgramsOfUser(req, res) {
        const { userId } = req.params;
        try {
            ProgramModel.listAllProgramsOfUser(userId, (error, result) => {
                if (error) {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(200).json({ programs: result });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async createProgram(req, res) {
        const { userId } = req.params;
        const programData = req.body;
        try {
            ProgramModel.createProgram(userId, programData, (error, result) => {
                if (error) {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(201).json({ program: result });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getProgramById(req, res) {
        const { programId } = req.params;
        try {
            ProgramModel.getProgramById(programId, (error, result) => {
                if (error) {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(200).json({ program: result });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async updateProgram(req, res) {
        const { programId } = req.params;
        const programData = req.body;
        try {
            ProgramModel.updateProgram(programId, programData, (error, result) => {
                if (error) {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(200).json({ message: result.message });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async deleteProgram(req, res) {
        const { programId } = req.params;
        try {
            ProgramModel.deleteProgram(programId, (error, result) => {
                if (error) {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(200).json({ message: result.message });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}


export default ProgramController;
