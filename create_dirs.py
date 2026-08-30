import os

base_dirs = [
    r"C:\Users\patil\Downloads\university-rag\RAD-UniQA",
    r"C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\RAD-UniQA"
]

subdirs = [
    r"docs\raw_documents",
    r"docs\processed_chunks",
    r"src\ingestion",
    r"src\retriever",
    r"src\generator",
    r"src\api",
    r"scripts",
    r"tests",
    r".agents\skills\rag-university-qa"
]

for b in base_dirs:
    for s in subdirs:
        p = os.path.join(b, s)
        os.makedirs(p, exist_ok=True)

print("All directories created successfully.")
