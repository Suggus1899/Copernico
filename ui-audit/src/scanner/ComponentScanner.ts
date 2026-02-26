/**
 * Component Scanner Interface
 * Responsible for discovering and loading React components for analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { Node } from '@babel/types';
import type { ComponentFile, ParsedComponent, ComponentMetadata, Import, Export, JSXElement } from '../types/core.js';

export interface IComponentScanner {
    /**
     * Recursively scan a directory for React component files (.jsx, .tsx)
     * @param path - Directory path to scan
     * @returns Array of component files found
     */
    scanDirectory(path: string): Promise<ComponentFile[]>;

    /**
     * Parse a component file into an AST representation
     * @param file - Component file to parse
     * @returns Parsed component with AST and metadata
     */
    parseComponent(file: ComponentFile): Promise<ParsedComponent>;

    /**
     * Extract metadata from a parsed component
     * @param component - Parsed component
     * @returns Component metadata
     */
    extractMetadata(component: ParsedComponent): ComponentMetadata;
}

/**
 * ComponentScanner implementation
 * Scans directories for React components and parses them into AST
 */
export class ComponentScanner implements IComponentScanner {
    /**
     * Recursively scan a directory for React component files (.jsx, .tsx)
     */
    async scanDirectory(dirPath: string): Promise<ComponentFile[]> {
        const componentFiles: ComponentFile[] = [];

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    const subFiles = await this.scanDirectory(fullPath);
                    componentFiles.push(...subFiles);
                } else if (entry.isFile() && this.isComponentFile(entry.name)) {
                    // Read component file
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const stats = await fs.stat(fullPath);

                    componentFiles.push({
                        path: fullPath,
                        name: entry.name,
                        content,
                        size: stats.size
                    });
                }
            }
        } catch (error) {
            throw new Error(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return componentFiles;
    }

    /**
     * Parse a component file into an AST representation
     */
    async parseComponent(file: ComponentFile): Promise<ParsedComponent> {
        try {
            // Parse the file content into an AST
            const ast = parse(file.content, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'classProperties',
                    'decorators-legacy'
                ]
            });

            // Extract imports, exports, and JSX elements
            const imports: Import[] = [];
            const exports: Export[] = [];
            const jsx: JSXElement[] = [];

            traverse(ast, {
                ImportDeclaration(nodePath) {
                    const node = nodePath.node;
                    const specifiers = node.specifiers.map(spec => {
                        if (spec.type === 'ImportDefaultSpecifier') {
                            return spec.local.name;
                        } else if (spec.type === 'ImportSpecifier') {
                            return spec.imported.type === 'Identifier' ? spec.imported.name : '';
                        } else if (spec.type === 'ImportNamespaceSpecifier') {
                            return `* as ${spec.local.name}`;
                        }
                        return '';
                    }).filter(Boolean);

                    imports.push({
                        source: node.source.value,
                        specifiers,
                        isDefault: node.specifiers.some(s => s.type === 'ImportDefaultSpecifier')
                    });
                },

                ExportNamedDeclaration(nodePath) {
                    const node = nodePath.node;
                    if (node.declaration) {
                        if (node.declaration.type === 'VariableDeclaration') {
                            node.declaration.declarations.forEach(decl => {
                                if (decl.id.type === 'Identifier') {
                                    exports.push({
                                        name: decl.id.name,
                                        isDefault: false
                                    });
                                }
                            });
                        } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
                            exports.push({
                                name: node.declaration.id.name,
                                isDefault: false
                            });
                        } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
                            exports.push({
                                name: node.declaration.id.name,
                                isDefault: false
                            });
                        }
                    }
                },

                ExportDefaultDeclaration(nodePath) {
                    const node = nodePath.node;
                    let name = 'default';

                    if (node.declaration.type === 'Identifier') {
                        name = node.declaration.name;
                    } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
                        name = node.declaration.id.name;
                    } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
                        name = node.declaration.id.name;
                    }

                    exports.push({
                        name,
                        isDefault: true
                    });
                },

                JSXElement: (nodePath) => {
                    const node = nodePath.node as any;
                    const jsxElement = this.extractJSXElement(node, file.path);
                    jsx.push(jsxElement);
                }
            });

            return {
                file,
                ast: ast as Node,
                imports,
                exports,
                jsx
            };
        } catch (error) {
            throw new Error(`Failed to parse component ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract metadata from a parsed component
     */
    extractMetadata(component: ParsedComponent): ComponentMetadata {
        const metadata: ComponentMetadata = {
            name: this.extractComponentName(component),
            type: 'functional',
            hooks: [],
            props: [],
            state: [],
            hasStyles: false,
            dependencies: []
        };

        traverse(component.ast, {
            // Detect class components
            ClassDeclaration(nodePath) {
                const node = nodePath.node;
                if (node.superClass &&
                    ((node.superClass.type === 'Identifier' &&
                        (node.superClass.name === 'Component' || node.superClass.name === 'PureComponent')) ||
                        (node.superClass.type === 'MemberExpression' &&
                            node.superClass.property.type === 'Identifier' &&
                            (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent')))) {
                    metadata.type = 'class';
                }
            },

            // Detect React hooks
            CallExpression(nodePath) {
                const node = nodePath.node;
                if (node.callee.type === 'Identifier' && node.callee.name.startsWith('use')) {
                    const hookName = node.callee.name;
                    if (!metadata.hooks.includes(hookName)) {
                        metadata.hooks.push(hookName);
                    }
                }
            }
        });

        // Extract dependencies from imports
        metadata.dependencies = component.imports.map(imp => imp.source);

        // Check for styles
        metadata.hasStyles = component.imports.some(imp =>
            imp.source.endsWith('.css') ||
            imp.source.endsWith('.scss') ||
            imp.source.endsWith('.sass') ||
            imp.source.includes('styled-components') ||
            imp.source.includes('@emotion')
        );

        return metadata;
    }

    /**
     * Check if a file is a React component file
     */
    private isComponentFile(filename: string): boolean {
        return /\.(jsx|tsx)$/.test(filename);
    }

    /**
     * Extract component name from parsed component
     */
    private extractComponentName(component: ParsedComponent): string {
        // Try to get name from default export
        const defaultExport = component.exports.find(exp => exp.isDefault);
        if (defaultExport && defaultExport.name !== 'default') {
            return defaultExport.name;
        }

        // Try to get name from named exports
        if (component.exports.length > 0) {
            return component.exports[0].name;
        }

        // Fallback to filename without extension
        return path.basename(component.file.name, path.extname(component.file.name));
    }

    /**
     * Extract JSX element information
     */
    private extractJSXElement(node: any, filePath: string): JSXElement {
        const type = node.openingElement.name.type === 'JSXIdentifier'
            ? node.openingElement.name.name
            : 'unknown';

        const props: Record<string, unknown> = {};
        node.openingElement.attributes.forEach((attr: any) => {
            if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
                props[attr.name.name] = attr.value ? this.extractJSXAttributeValue(attr.value) : true;
            }
        });

        const children: JSXElement[] = [];
        if (node.children) {
            node.children.forEach((child: any) => {
                if (child.type === 'JSXElement') {
                    children.push(this.extractJSXElement(child, filePath));
                }
            });
        }

        return {
            type,
            props,
            children,
            location: {
                file: filePath,
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0,
                endLine: node.loc?.end.line,
                endColumn: node.loc?.end.column
            }
        };
    }

    /**
     * Extract JSX attribute value
     */
    private extractJSXAttributeValue(value: any): unknown {
        if (!value) return true;

        if (value.type === 'StringLiteral') {
            return value.value;
        } else if (value.type === 'JSXExpressionContainer') {
            if (value.expression.type === 'BooleanLiteral') {
                return value.expression.value;
            } else if (value.expression.type === 'NumericLiteral') {
                return value.expression.value;
            } else if (value.expression.type === 'StringLiteral') {
                return value.expression.value;
            }
            return '[expression]';
        }

        return '[complex]';
    }
}
