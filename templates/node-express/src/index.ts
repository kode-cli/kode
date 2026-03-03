import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: '<%= projectName %>' });
});

app.listen(PORT, () => {
    console.log(`<%= projectName %> running on http://localhost:${PORT}`);
});

export default app;