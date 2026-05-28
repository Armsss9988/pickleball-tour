import os

docs_dir = "/media/am/Data_D/AMWork/ai/golab-tournament-pickleball/docs"
doc_files = sorted([f for f in os.listdir(docs_dir) if f.endswith(".md") and f[0].isdigit()])

for df in doc_files:
    path = os.path.join(docs_dir, df)
    print(f"=== {df} ===")
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        headings = [line.strip() for line in lines if line.strip().startswith("#")]
        # Print headings and first 10 non-empty lines that aren't headings
        non_empty = [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]
        
        print("HEADINGS:")
        for h in headings[:10]:
            print(f"  {h}")
        if len(headings) > 10:
            print(f"  ... and {len(headings)-10} more headings")
            
        print("SAMPLE CONTENT:")
        for ne in non_empty[:5]:
            print(f"  {ne[:120]}")
    print("\n" + "="*80 + "\n")
