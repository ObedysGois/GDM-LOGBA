import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, File, Loader2 } from 'lucide-react';
import { validateFileType, validateFileSize } from '../supabaseUtils';

const FileUpload = ({ 
  onFilesSelected, 
  multiple = false, 
  acceptedTypes = ['image/*', 'application/pdf'], 
  maxSizeMB = 50,
  maxFiles = 5,
  placeholder = "Arraste arquivos aqui ou clique para selecionar"
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    // Validar número máximo de arquivos
    if (selectedFiles.length + fileArray.length > maxFiles) {
      newErrors.push(`Máximo de ${maxFiles} arquivos permitidos`);
    }

    fileArray.forEach((file, index) => {
      // Validar tipo
      if (!validateFileType(file, acceptedTypes)) {
        newErrors.push(`${file.name}: Tipo de arquivo não suportado`);
        return;
      }

      // Validar tamanho
      if (!validateFileSize(file, maxSizeMB)) {
        newErrors.push(`${file.name}: Arquivo muito grande (máx. ${maxSizeMB}MB)`);
        return;
      }

      validFiles.push(file);
    });

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const updatedFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText size={20} className="text-red-500" />;
    } else {
      return <File size={20} className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      {/* Área de upload */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        <div className="upload-content">
          {uploading ? (
            <>
              <Loader2 size={24} className="spinner" />
              <p>Fazendo upload...</p>
            </>
          ) : (
            <>
              <Upload size={24} />
              <p>{placeholder}</p>
              <p className="upload-hint">
                Tipos aceitos: {acceptedTypes.join(', ')} | Máx: {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Lista de arquivos selecionados */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Arquivos selecionados ({selectedFiles.length})</h4>
          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}`} className="file-item">
                <div className="file-info">
                  {getFileIcon(file)}
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="remove-file-btn"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens de erro */}
      {errors.length > 0 && (
        <div className="upload-errors">
          {errors.map((error, index) => (
            <p key={`error-${index}`} className="error-message">
              ⚠️ {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 