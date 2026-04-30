const fs = require("fs");
const path = require("path");
const { resolveWithinRoot } = require("../../utils/pathUtils");

class NasService {
    constructor({ storageService }) {
        this.storageService = storageService;
    }   

    resolvePath(rootKey, relativePath) {
        const rootPath = this.storageService.getRootPath(rootKey);

        if (!rootPath) {
            const error = new Error("root_not_configured");
            error.code = "root_not_configured";
            throw error;
        }

        const resolvedPath = this.storageService.resolvePath(rootKey, relativePath);

        if (!resolvedPath) {
            const error = new Error("invalid_path");
            error.code = "invalid_path";
            throw error;
        }

        return {root: rootPath, resolvedPath};    
    }


    async listDirectory(rootKey, relativePath = "", options = {}) {
        const { resolvedPath } = this.resolvePath(rootKey, relativePath);
        
        const entries = this.storageService.listDirectory(resolvedPath)

        const result = Promise.all(
            entries.map(async (item)=>{
                if(entries.type === 'directory')
                {


                    return{
                        ...entries

                    }
                }
            })
        )

    }

    async recurseList(rootKey, entries)
    {
        
        return Promisse.all(entries.map(async (item)=>{
            if(item.type === 'directory')
            {
                const children = this.storageService.listDirectory(rootKey, item.relativePath)
            }
        }))
        
    }



}