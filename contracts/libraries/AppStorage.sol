

struct AppStorage {
    mapping(address => uint256) _balances;

    mapping(address => mapping(address => uint256)) _allowances;

    uint256 _totalSupply;
    uint256 _currentSupply;

    string _name;
    string _symbol;
}