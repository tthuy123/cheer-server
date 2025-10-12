import ExerciseModel from "../models/exercise.model.js";

const ExerciseController = {
    listAllExercises: (req, res) => {
        const page = parseInt(req.query.page) || 1;
        ExerciseModel.listAllExercises(page, (error, exercises) => {
            if (error) {
                return res.status(500).json({ error });
            }
            res.json(exercises);
        });
    },
    listAllExercisesOfProgram: (req, res) => {
        const programId = req.params.programId;
        ExerciseModel.listAllExercisesOfProgram(programId, (error, exercises) => {
            if (error) {
                return res.status(500).json({ error });
            }
            res.json(exercises);
        });
    },
    searchExercisesByName: (req, res) => {
        const name = req.query.name;
        ExerciseModel.searchExercisesByName(name, (error, exercises) => {
            if (error) {
                return res.status(500).json({ error });
            }
            res.json(exercises);
        });
    },
    getExerciseById: (req, res) => {
        const id = req.params.id;
        ExerciseModel.getExerciseById(id, (error, exercise) => {
            if (error) {
                return res.status(500).json({ error });
            }
            res.json(exercise);
        });
    }
};

export default ExerciseController;
