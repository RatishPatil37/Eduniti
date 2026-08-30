import pymupdf
import os

files = {
    "technical_architecture": r"C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\technical architecture.pdf",
    "project_specifications": r"C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\project specifications.pdf",
    "antigravity_skills": r"C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\antigravity skills.pdf",
}

output_dir = r"C:\Users\patil\Downloads\university-rag\pdf_images"
os.makedirs(output_dir, exist_ok=True)

for name, path in files.items():
    doc = pymupdf.open(path)
    for i, page in enumerate(doc):
        img = page.get_pixmap(dpi=150)
        out_path = os.path.join(output_dir, f"{name}_page{i+1}.png")
        img.save(out_path)
        print(f"Saved: {out_path}")

print("Done!")
