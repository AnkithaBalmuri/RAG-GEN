# AstroRAG - Space & Astronomy RAG Assistant

AstroRAG is a Next.js RAG chatbot that answers only from documents you place in the project `data/` folder and index into Pinecone.

## Knowledge Base Folder

Put your documents here:

```text
data/
```

Supported file formats:

- `.md`
- `.txt`
- `.pdf`

Do not place documents in `app/`, `public/`, or `components/`. The ingestion script reads only the `data/` folder.

## Add Or Update Documents

1. Copy your 50+ space or astronomy documents into `data/`.
2. Supported examples:

```text
data/
  chandrayaan-notes.md
  solar-system-guide.txt
  telescope-reference.pdf
```

3. Re-index the knowledge base:

```bash
npm run ingest
```

Run `npm run ingest` every time you add, edit, or delete files in `data/`.

## Ingestion

The ingestion command:

- Reads all `.md`, `.txt`, and `.pdf` files from `data/`
- Extracts text
- Splits text into chunks
- Generates embeddings with `Xenova/all-MiniLM-L6-v2`
- Clears the active Pinecone namespace
- Uploads the current document chunks to Pinecone

```bash
npm run ingest
```

After ingestion, start the app:

```bash
npm run dev
```

## Environment Variables

Create `.env.local`:

```bash
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
PINECONE_API_KEY=
PINECONE_INDEX_NAME=astrorag-384
PINECONE_HOST=
```

The included embedding model creates `384`-dimension vectors. Your Pinecone index must use dimension `384`.

## Answer Behavior

The chatbot answers only from retrieved Pinecone chunks created from your `data/` documents.

If relevant information is not found, it responds:

```text
I could not find this information in the provided documents.
```

Responses include source document names, retrieved chunk references, query type, rewritten query when used, and confidence score.

## Adaptive RAG

The project keeps the existing Pinecone RAG workflow and adds:

- Query analysis: simple factual, comparative, multi-hop, or broad exploratory.
- Retrieval evaluation: average similarity and confidence score.
- Query rewriting: low-confidence retrievals are retried with a retrieval-friendly query.
- Citation validation: source filenames and chunk numbers are returned with answers.
- Hallucination prevention: answers must use only retrieved context.
- Logging: each chat run is saved to `evaluation/adaptive-rag-logs.jsonl`.

## Evaluation

Evaluation questions live in:

```text
evaluation/questions.json
```

Run the 20-question evaluation dataset:

```bash
npm run evaluate
```

The generated report is saved to:

```text
evaluation/results.json
```

The Evaluation page can also run the same dataset. It reports Context Precision, Context Recall, Retrieval Relevance, Faithfulness, Answer Relevance, Answer Correctness, and Conciseness.

The Error Analysis page at `/error-analysis` shows failed retrievals, low-confidence responses, and missing-context cases.

## Project Structure

```text
project/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   ├── error-analysis/
│   │   ├── evaluate/
│   │   └── search/
│   ├── chat/
│   ├── error-analysis/
│   ├── evaluation/
│   └── upload/
├── components/
├── evaluation/
│   ├── questions.json
│   ├── results.json
│   └── adaptive-rag-logs.jsonl
├── lib/
├── scripts/
│   ├── evaluate.ts
│   └── ingest.ts
├── data/
│   ├── document1.md
│   ├── document2.pdf
│   └── ...
├── package.json
└── README.md
```

## Local Development

```bash
npm install
npm run ingest
npm run dev
```

Open `http://localhost:3000`.

In the Codex in-app browser, use the network URL shown by Next.js, usually:

```text
http://192.168.56.1:3000/
```
