from agents.sentinel import analyze_inventory
import json

if __name__ == "__main__":
    print("Running Sentinel Analysis...")
    result = analyze_inventory()
    print(json.dumps(result, indent=2))
