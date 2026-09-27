import os

# Set environment variables FIRST to bypass Windows permission blocks
local_cache_path = os.path.abspath("./hf_cache")
os.environ["HF_HOME"] = local_cache_path
os.environ["HF_DATASETS_CACHE"] = os.path.join(local_cache_path, "datasets")
os.environ["HF_HUB_CACHE"] = os.path.join(local_cache_path, "hub")

import chromadb
from datasets import load_dataset
# NEW: Import the SentenceTransformer function
from chromadb.utils import embedding_functions 

def build_vector_db():
    print("[*] Initializing ChromaDB Persistent Client...")
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # NEW: We force Chroma to use SentenceTransformers so it respects our HF_HOME bypass
    hf_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    
    # We pass the embedder into the collection so it knows exactly how to process the math
    try:
        collection = client.get_or_create_collection(
            name="company_code_fixes",
            metadata={"description": "Corporate debugging knowledge base"},
            embedding_function=hf_embedder
        )
    except Exception:
        collection = client.get_collection(
            name="company_code_fixes",
            embedding_function=hf_embedder
        )
    
    print("[*] Downloading training dataset from Hugging Face...")
    
    dataset = load_dataset(
        "m-a-p/CodeFeedback-Filtered-Instruction", 
        split="train[:5000]",
        cache_dir=os.environ["HF_DATASETS_CACHE"]
    )
    
    docs = []
    metadatas = []
    ids = []
    
    print("[*] Processing and embedding data...")
    print("(Note: It will download a 90MB embedding model on the very first run)")
    
    for i, row in enumerate(dataset):
        query = (row.get("instruction") or "").strip()
        answer = (row.get("answer") or "").strip()
        
        if not query and not answer:
            continue
            
        docs.append(f"Problem: {query}\nSolution: {answer}")
        
        # Smart Language Detector for the Dashboard Analytics
        query_lower = query.lower() + " " + answer.lower()
        
        if "public class " in query_lower or "system.out" in query_lower:
            language = "java"
        elif "#include" in query_lower or "std::" in query_lower:
            language = "c++"
        elif "func " in query_lower and "fmt." in query_lower:
            language = "go"
        elif "def " in query_lower or "import pandas" in query_lower:
            language = "python"
        elif "<?php" in query_lower or "$_post" in query_lower or "$_get" in query_lower:
            language = "php"
        elif "<html>" in query_lower or "</div>" in query_lower or "href=" in query_lower:
            language = "html"
        elif "margin:" in query_lower and "padding:" in query_lower or "display: flex" in query_lower:
            language = "css"
        elif "select " in query_lower and " from " in query_lower or "insert into" in query_lower:
            language = "sql"
        elif "#!/bin/bash" in query_lower or "apt-get" in query_lower or "chmod " in query_lower:
            language = "bash"
        elif "function" in query_lower or "console.log" in query_lower or "const " in query_lower:
            language = "javascript"
        else:
            language = "typescript" # Catch-all for other web scripts
            
        category = "syntax_error" if "error" in query_lower else "logic_optimization"
        
        metadatas.append({
            "source": "huggingface/CodeFeedback",
            "language": language,
            "category": category
        })
        ids.append(f"code_fix_{i}")

    # Batch upsert to prevent ChromaDB max_batch_size and SentenceTransformer memory overflow
    try:
        max_batch = client.get_max_batch_size()
    except Exception:
        max_batch = 500
        
    batch_size = min(max_batch, 100)
    total_docs = len(docs)
    total_batches = (total_docs + batch_size - 1) // batch_size

    print(f"[*] Upserting {total_docs} documents into ChromaDB in {total_batches} batches of {batch_size}...")
    for b in range(total_batches):
        start_idx = b * batch_size
        end_idx = min(start_idx + batch_size, total_docs)
        
        collection.upsert(
            documents=docs[start_idx:end_idx],
            metadatas=metadatas[start_idx:end_idx],
            ids=ids[start_idx:end_idx]
        )
        pct = (end_idx / total_docs) * 100
        print(f"    [+] Embedded batch {b + 1}/{total_batches} ({end_idx}/{total_docs} records - {pct:.1f}%)")
    
    print(f"[✓] Successfully embedded and saved {len(docs)} training examples to ./chroma_db")

if __name__ == "__main__":
    build_vector_db()