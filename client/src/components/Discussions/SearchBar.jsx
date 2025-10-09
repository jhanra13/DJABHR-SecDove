import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

function SearchBar({ onSearch }) {
    return (
        <div style={{ flex: 1 }}>
            <div className="search-container">
                <FontAwesomeIcon icon={faSearch} />
                <input
                    type="text"
                    placeholder="Search..."
                    onChange={(e) => onSearch?.(e.target.value)}
                />
            </div>
        </div>
    );
}

export default SearchBar;